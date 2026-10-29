Add-Type -AssemblyName System.Speech
$assembly=[System.Speech.Synthesis.SpeechSynthesizer].Assembly.Location
Add-Type -ReferencedAssemblies $assembly -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Speech.Synthesis;
public class WritingSpeechMark { public double time; public int character; public int count; public string text; }
public class WritingNarrator {
 public static List<WritingSpeechMark> Render(string text, string path) {
  var marks=new List<WritingSpeechMark>();
  using(var synth=new SpeechSynthesizer()) {
   synth.SelectVoice("Microsoft Zira Desktop"); synth.Rate=2; synth.Volume=100;
   synth.SpeakProgress += (sender,e) => { lock(marks) { marks.Add(new WritingSpeechMark { time=e.AudioPosition.TotalSeconds, character=e.CharacterPosition, count=e.CharacterCount, text=e.Text }); } };
   synth.SetOutputToWaveFile(path, new System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, System.Speech.AudioFormat.AudioBitsPerSample.Sixteen, System.Speech.AudioFormat.AudioChannel.Mono)); synth.Speak(text); synth.SetOutputToNull();
  }
  return marks;
 }
}
"@
$projectRoot=Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$stories=Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot 'video-stories.json') | ConvertFrom-Json
$root=Join-Path $projectRoot 'work/writing-release/audio'
New-Item -ItemType Directory -Force $root | Out-Null
foreach($property in $stories.PSObject.Properties){
 $id=$property.Name; $i=0
 foreach($scene in $property.Value.scenes){
  $stem=Join-Path $root ($id+'-'+$i)
  $marks=[WritingNarrator]::Render($scene.text,$stem+'.wav')
  ConvertTo-Json -InputObject @($marks) -Depth 4 | Set-Content -Encoding UTF8 ($stem+'.json')
  Write-Output ($id+' scene '+$i+' / '+$marks.Count+' speech marks'); $i++
 }
}



