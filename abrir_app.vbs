Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
pasta = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = pasta

urlApi = "http://127.0.0.1:8000/api/disciplinas"
urlApp = "http://localhost:5173"

Function ServidorNoAr(url)
    On Error Resume Next
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.Open "GET", url, False
    http.SetTimeouts 500, 500, 500, 500
    http.Send
    ServidorNoAr = (Err.Number = 0 And http.Status > 0)
    On Error Goto 0
End Function

If Not ServidorNoAr(urlApi) Then
    shell.Run "cmd /c uvicorn api:app --host 127.0.0.1 --port 8000", 0, False
    WScript.Sleep 2500
    tentativas = 0
    Do While Not ServidorNoAr(urlApi) And tentativas < 20
        WScript.Sleep 500
        tentativas = tentativas + 1
    Loop
End If

If Not ServidorNoAr(urlApp) Then
    shell.Run "cmd /c cd frontend && npm run dev", 0, False
    WScript.Sleep 3000
    tentativas = 0
    Do While Not ServidorNoAr(urlApp) And tentativas < 30
        WScript.Sleep 500
        tentativas = tentativas + 1
    Loop
End If

shell.Run urlApp, 1, False
