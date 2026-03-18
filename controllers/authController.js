const { User, Source, Category } = require('../db/proxy');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const DEFAULT_SOURCES = [
  { name: 'Tiền mặt', type: 'cash',   icon: 'fa-money-bill-wave' },
  { name: 'Ngân hàng', type: 'number', icon: 'fa-building-columns' },
];

function getMailer() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
  });
}

const authController = {
  // GET /login
  loginPage: (req, res) => {
    if (req.session.userId) return res.redirect('/');
    res.render('login', { error: null, reset: req.query.reset === '1' });
  },

  // POST /login
  login: async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user || !(await user.comparePassword(password))) {
        return res.render('login', { error: 'Email hoặc mật khẩu không đúng' });
      }
      req.session.userId   = user._id;
      req.session.username = user.username;
      req.session.save(() => res.redirect('/'));
    } catch (err) {
      res.render('login', { error: 'Đã có lỗi xảy ra' });
    }
  },

  // GET /register
  registerPage: (req, res) => {
    if (req.session.userId) return res.redirect('/');
    res.render('register', { error: null, old: {} });
  },

  // POST /register
  register: async (req, res) => {
    const { username, email, password, confirmPassword } = req.body;
    const old = { username, email };

    if (!username || !email || !password || !confirmPassword) {
      return res.render('register', { error: 'Vui lòng điền đầy đủ thông tin', old });
    }
    if (password !== confirmPassword) {
      return res.render('register', { error: 'Mật khẩu xác nhận không khớp', old });
    }
    if (password.length < 6) {
      return res.render('register', { error: 'Mật khẩu phải có ít nhất 6 ký tự', old });
    }

    try {
      const exists = await User.findOne({ $or: [{ email }, { username }] });
      if (exists) {
        return res.render('register', { error: 'Email hoặc tên người dùng đã tồn tại', old });
      }
      const user = await User.create({ username, email, password });
      // Seed nguồn tiền mặc định
      for (const s of DEFAULT_SOURCES) {
        await Source.create({ userId: user._id, ...s });
      }
      req.session.userId   = user._id;
      req.session.username = user.username;
      req.session.save(() => res.redirect('/'));
    } catch (err) {
      console.error('Register error:', JSON.stringify(err, null, 2), err.message);
      let msg = 'Đã có lỗi xảy ra';
      if (err.code === 11000 || (err.message && err.message.includes('UNIQUE'))) msg = 'Email hoặc tên người dùng đã tồn tại';
      else if (err.name === 'ValidationError') msg = Object.values(err.errors).map(e => e.message).join(', ');
      else if (err.message) msg = err.message;
      return res.render('register', { error: msg, old });
    }
  },

  // GET /logout
  logout: (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
  },

  // GET /forgot-password
  forgotPage: (req, res) => {
    res.render('forgot', { error: null, success: null });
  },

  // POST /forgot-password
  forgotPassword: async (req, res) => {
    const { email } = req.body;
    try {
      const user = await User.findOne({ email });
      // Luôn hiện thông báo thành công để tránh email enumeration
      if (!user) {
        return res.render('forgot', { error: null, success: 'Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu.' });
      }
      const token = crypto.randomBytes(32).toString('hex');
      user.resetToken = token;
      user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 giờ
      await user.save();

      const port = require('fs').existsSync('.port') ? require('fs').readFileSync('.port','utf8').trim() : '';
      const baseUrl = (process.env.APP_URL && process.env.APP_URL !== 'http://localhost')
        ? process.env.APP_URL
        : `http://localhost${port ? ':'+port : ''}`;
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      await getMailer().sendMail({
        from: process.env.MAIL_FROM || 'FinanceApp',
        to: user.email,
        subject: 'Đặt lại mật khẩu FinanceApp',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto">
            <h2>Đặt lại mật khẩu</h2>
            <p>Bạn vừa yêu cầu đặt lại mật khẩu. Bấm vào nút bên dưới để tiếp tục:</p>
            <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Đặt lại mật khẩu</a>
            <p style="margin-top:16px;color:#64748b;font-size:13px">Link có hiệu lực trong 1 giờ. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
          </div>
        `
      });

      res.render('forgot', { error: null, success: 'Đã gửi link đặt lại mật khẩu về email của bạn.' });
    } catch (err) {
      console.error('forgotPassword error:', err);
      res.render('forgot', { error: 'Đã có lỗi xảy ra, thử lại sau.', success: null });
    }
  },

  // GET /reset-password?token=...
  resetPage: async (req, res) => {
    const { token } = req.query;
    const user = await User.findOne({ resetToken: token });
    if (!user || !user.resetTokenExpiry || new Date() > new Date(user.resetTokenExpiry)) {
      return res.render('reset', { error: 'Link không hợp lệ hoặc đã hết hạn.', token: null });
    }
    res.render('reset', { error: null, token });
  },

  // POST /reset-password
  resetPassword: async (req, res) => {
    const { token, password, confirmPassword } = req.body;
    if (!password || password.length < 6) {
      return res.render('reset', { error: 'Mật khẩu phải có ít nhất 6 ký tự.', token });
    }
    if (password !== confirmPassword) {
      return res.render('reset', { error: 'Mật khẩu xác nhận không khớp.', token });
    }
    try {
      const user = await User.findOne({ resetToken: token });
      if (!user || !user.resetTokenExpiry || new Date() > new Date(user.resetTokenExpiry)) {
        return res.render('reset', { error: 'Link không hợp lệ hoặc đã hết hạn.', token: null });
      }
      const bcrypt = require('bcryptjs');
      // Hash thủ công vì SQLite không có pre-save hook
      // Với MongoDB, tạm thời disable hook bằng cách set trực tiếp vào DB
      const hashed = await bcrypt.hash(password, 10);
      await User.findByIdAndUpdate(user._id || user.id, {
        password: hashed,
        resetToken: null,
        resetTokenExpiry: null
      });
      res.redirect('/login?reset=1');
    } catch (err) {
      console.error('resetPassword error:', err);
      res.render('reset', { error: 'Đã có lỗi xảy ra.', token });
    }
  }
};

module.exports = authController;
