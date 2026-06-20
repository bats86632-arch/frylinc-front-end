$path = "d:\desktop\backend\front-end\src\pages\AdminSettings.tsx"
$bytes = [System.IO.File]::ReadAllBytes($path)
if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    Write-Host "UTF-8 BOM detected. Removing it."
    $bytes = $bytes[3..($bytes.Length - 1)]
}

# Read string as UTF-8
$text = [System.Text.Encoding]::UTF8.GetString($bytes)

# Replace the mangled texts
$text = $text.Replace("â€”", "—")
$text = $text.Replace("Loadingâ€¦", "● Loading…")
$text = $text.Replace("??", "—")
$text = $text.Replace("Loading?", "● Loading…")

# Save as UTF8 without BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($path, $text, $utf8NoBom)
Write-Host "File saved as UTF-8 without BOM and text replaced."
