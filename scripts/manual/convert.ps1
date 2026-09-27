# Converts the manual DOCX files to PDF with Microsoft Word.
# (HWPX is written by build.mts with kordoc; Hangul automation cannot open files on this PC.)
# Run from the project folder:  powershell -File scripts/manual/convert.ps1
param([string]$Folder = "사용설명서(사용자용)")
$ErrorActionPreference = "Stop"
$dir = Join-Path (Get-Location) $Folder
$docs = Get-ChildItem $dir -Filter "*.docx"

$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
  foreach ($d in $docs) {
    $doc = $word.Documents.Open($d.FullName, $false, $false)
    $doc.TablesOfContents | ForEach-Object { $_.Update() }   # fill the table of contents
    $doc.Save()
    $pdf = [IO.Path]::ChangeExtension($d.FullName, ".pdf")
    $doc.ExportAsFixedFormat($pdf, 17)                       # 17 = PDF
    $doc.Close($false)
    "PDF  $pdf"
  }
} finally { $word.Quit() }

