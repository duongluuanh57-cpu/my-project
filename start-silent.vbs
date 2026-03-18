Set WshShell = CreateObject("WScript.Shell")
Dim dir
dir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\") - 1)
WshShell.CurrentDirectory = dir

Dim fso
Set fso = CreateObject("Scripting.FileSystemObject")

' Cai node_modules neu chua co
If Not fso.FolderExists(dir & "\node_modules") Then
    WshShell.Run "cmd /c npm install", 1, True
End If

' Tao .env neu chua co
If Not fso.FileExists(dir & "\.env") Then
    WshShell.Run "cmd /c node -e ""var c=require('crypto');var s=c.randomBytes(32).toString('hex');var e=c.randomBytes(32).toString('hex');require('fs').writeFileSync('.env','MONGO_URI=mongodb://localhost:27017/QuanLyTaiChinh\nSESSION_SECRET='+s+'\nENCRYPT_SECRET='+e+'\n');""", 0, True
End If

' Xoa file .port cu neu co
If fso.FileExists(dir & "\.port") Then fso.DeleteFile dir & "\.port"

' Start server
WshShell.Run "cmd /c node server.js > .server.log 2>&1", 0, False

' Cho den khi file .port xuat hien
Dim portFile
portFile = dir & "\.port"
Dim i
For i = 1 To 30
    WScript.Sleep 1000
    If fso.FileExists(portFile) Then Exit For
Next

' Doc port va mo browser
If fso.FileExists(portFile) Then
    Dim ts
    Set ts = fso.OpenTextFile(portFile, 1)
    Dim port
    port = Trim(ts.ReadLine())
    ts.Close
    WshShell.Run "http://localhost:" & port, 1, False
End If
