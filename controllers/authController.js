const { User } = require('../db/proxy');

const authController = {
  // GET /login
  loginPage: (req, res) => {
    if (req.session.userId) return res.redirect('/');
    res.render('login', { error: null });
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
    res.render('register', { error: null });
  },

  // POST /register
  register: async (req, res) => {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password || !confirmPassword) {
      return res.render('register', { error: 'Vui lòng điền đầy đủ thông tin' });
    }
    if (password !== confirmPassword) {
      return res.render('register', { error: 'Mật khẩu xác nhận không khớp' });
    }
    if (password.length < 6) {
      return res.render('register', { error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    try {
      const exists = await User.findOne({ $or: [{ email }, { username }] });
      if (exists) {
        return res.render('register', { error: 'Email hoặc tên người dùng đã tồn tại' });
      }
      const user = await User.create({ username, email, password });
      req.session.userId   = user._id;
      req.session.username = user.username;
      req.session.save(() => res.redirect('/'));
    } catch (err) {
      console.error('Register error:', JSON.stringify(err, null, 2), err.message);
      let msg = 'Đã có lỗi xảy ra';
      if (err.code === 11000 || (err.message && err.message.includes('UNIQUE'))) msg = 'Email hoặc tên người dùng đã tồn tại';
      else if (err.name === 'ValidationError') msg = Object.values(err.errors).map(e => e.message).join(', ');
      else if (err.message) msg = err.message;
      return res.render('register', { error: msg });
    }
  },

  // GET /logout
  logout: (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
  }
};

module.exports = authController;
