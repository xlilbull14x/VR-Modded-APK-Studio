// Advanced VR APK Static Binary Analysis Module

const VANILLA_SYSTEM_LIBS = new Set([
  'libunity.so', 'libil2cpp.so', 'libovrloader.so', 'libopenxr_loader.so',
  'libmain.so', 'libmono.so', 'libvrapi.so', 'libgdx.so', 'libeura.so',
  'libglesv1_cm.so', 'libglesv2.so', 'libglesv3.so', 'libegl.so', 'libvulkan.so',
  'liblog.so', 'libm.so', 'libc.so', 'libdl.so', 'libz.so', 'libandroid.so'
]);

function analyzeBinaries(fileList) {
  const soFiles = fileList.filter(f => f.endsWith('.so'));
  const customLibraries = [];
  const detectedFrameworks = [];

  soFiles.forEach(f => {
    const fileName = f.split('/').pop().toLowerCase();
    if (!VANILLA_SYSTEM_LIBS.has(fileName)) {
      customLibraries.push(fileName);
      if (fileName.includes('hook') || fileName.includes('beatsaber')) {
        detectedFrameworks.push('QuestHook / Native Mod Framework');
      } else if (fileName.includes('melon') || fileName.includes('mono')) {
        detectedFrameworks.push('MelonLoader C# Bridge');
      } else if (fileName.includes('bepinex')) {
        detectedFrameworks.push('BepInEx Engine');
      }
    }
  });

  return {
    totalLibraries: soFiles.length,
    customLibraries,
    detectedFrameworks: [...new Set(detectedFrameworks)],
    isModded: customLibraries.length > 0,
    securityRating: customLibraries.length > 0 ? 'Modified / Injected' : 'Vanilla / Unmodified'
  };
}

module.exports = { analyzeBinaries };
