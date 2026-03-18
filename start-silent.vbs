Set WshShell = CreateObject("WScript.Shell")
Dim dir
dir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\") - 1)
WshShell.CurrentDirectory = dir

' Xoa file .port cu neu co
Dim fso
Set fso = CreateObject("Scripting.FileSystemObject")
If fso.FileExists(dir & "\.port") Then fso.DeleteFile dir & "\.port"

' Start server
WshShell.Run "cmd /c npm run dev", 0, False

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
