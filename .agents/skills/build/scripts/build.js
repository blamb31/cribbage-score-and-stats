const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '../../../../');
const packageJsonPath = path.join(rootDir, 'package.json');
const gradlePath = path.join(rootDir, 'android/app/build.gradle');

console.log('--- STARTING ANDROID BUILD PROCESS ---');

function detectJavaHome() {
  if (process.env.JAVA_HOME && fs.existsSync(process.env.JAVA_HOME)) {
    return process.env.JAVA_HOME;
  }
  const paths = [];
  if (process.platform === 'darwin') {
    paths.push(
      '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
      '/Applications/Android Studio.app/Contents/jre/Contents/Home'
    );
  } else if (process.platform === 'win32') {
    paths.push(
      'C:\\Program Files\\Android\\Android Studio\\jbr',
      'C:\\Program Files\\Android\\Android Studio\\jre'
    );
  } else if (process.platform === 'linux') {
    paths.push(
      '/opt/android-studio/jbr',
      '/opt/android-studio/jre',
      '/usr/local/android-studio/jbr',
      '/usr/local/android-studio/jre'
    );
  }
  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

const javaHome = detectJavaHome();
if (javaHome) {
  process.env.JAVA_HOME = javaHome;
  console.log(`Setting JAVA_HOME to: ${javaHome}`);
} else {
  console.warn('Warning: Could not automatically locate Android Studio JDK. Relying on default system path.');
}

try {
  // 1. Read and bump package.json version
  console.log('Reading package.json...');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const oldVersion = packageJson.version;
  const versionParts = oldVersion.split('.').map(Number);
  if (versionParts.length !== 3 || versionParts.some(isNaN)) {
    throw new Error(`Invalid version format in package.json: ${oldVersion}`);
  }
  versionParts[2] += 1; // Bump patch version
  const newVersion = versionParts.join('.');
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
  console.log(`Package.json version bumped: ${oldVersion} -> ${newVersion}`);

  // 2. Read and bump android/app/build.gradle versionCode and versionName
  console.log('Reading android/app/build.gradle...');
  let gradleContent = fs.readFileSync(gradlePath, 'utf8');

  // Find and bump versionCode
  const versionCodeRegex = /(versionCode\s+)(\d+)/;
  const versionCodeMatch = gradleContent.match(versionCodeRegex);
  if (!versionCodeMatch) {
    throw new Error('Could not find versionCode in build.gradle');
  }
  const oldVersionCode = parseInt(versionCodeMatch[2], 10);
  const newVersionCode = oldVersionCode + 1;
  gradleContent = gradleContent.replace(versionCodeRegex, `$1${newVersionCode}`);
  console.log(`VersionCode bumped: ${oldVersionCode} -> ${newVersionCode}`);

  // Find and update versionName
  const versionNameRegex = /(versionName\s+)"([^"]+)"/;
  const versionNameMatch = gradleContent.match(versionNameRegex);
  if (!versionNameMatch) {
    throw new Error('Could not find versionName in build.gradle');
  }
  gradleContent = gradleContent.replace(versionNameRegex, `$1"${newVersion}"`);
  console.log(`VersionName updated: "${versionNameMatch[2]}" -> "${newVersion}"`);

  fs.writeFileSync(gradlePath, gradleContent, 'utf8');
  console.log('build.gradle updated successfully.');

  // 3. Build Angular web assets
  console.log('Building Angular web assets (npm run build)...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

  // 4. Sync Capacitor
  console.log('Syncing Capacitor android platform (npx cap sync android)...');
  execSync('npx cap sync android', { cwd: rootDir, stdio: 'inherit' });

  // 5. Build native Android app (APK and AAB)
  console.log('Compiling native Android APK (gradlew assembleDebug)...');
  const gradlewCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  execSync(`${gradlewCmd} assembleDebug`, { cwd: path.join(rootDir, 'android'), stdio: 'inherit' });

  console.log('Compiling native Android AAB (gradlew bundleRelease)...');
  execSync(`${gradlewCmd} bundleRelease`, { cwd: path.join(rootDir, 'android'), stdio: 'inherit' });

  console.log('\n--- ANDROID BUILD SUCCESSFUL ---');
  const apkPath = path.join(rootDir, 'android/app/build/outputs/apk/debug/app-debug.apk');
  const aabPath = path.join(rootDir, 'android/app/build/outputs/bundle/release/app-release.aab');

  if (fs.existsSync(apkPath)) {
    console.log(`\nBuilt APK is available at:\n${apkPath}`);
  } else {
    console.log('\nAPK output file could not be found.');
  }
  if (fs.existsSync(aabPath)) {
    console.log(`\nBuilt AAB is available at:\n${aabPath}`);
  } else {
    console.log('\nAAB output file could not be found.');
  }

} catch (err) {
  console.error('\nBuild failed with error:', err.message);
  process.exit(1);
}
