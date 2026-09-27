# Converts the manual DOCX files to PDF (Microsoft Word) and HWPX (Hangul).
# Run from the project folder:  powershell -File scripts/manual/convert.ps1
$ErrorActionPreference = "Stop"
$dir = Join-Path (Get-Location) "사용설명서(사용자용)"
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

$hwp = New-Object -ComObject HWPFrame.HwpObject
try {
  foreach ($d in $docs) {
    $out = [IO.Path]::ChangeExtension($d.FullName, ".hwpx")
    if (-not $hwp.Open($d.FullName, "", "")) { throw "Hangul could not open $($d.Name)" }
    if (-not $hwp.SaveAs($out, "HWPX", "")) { throw "Hangul could not save $out" }
    "HWPX $out"
  }
} finally { $hwp.Quit() }
