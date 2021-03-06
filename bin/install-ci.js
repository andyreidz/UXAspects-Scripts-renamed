#!/usr/bin/env node

/**
 * Install one or more packages from the snapshot registry. This script will attempt to install packages related to the
 * current build by assuming that any builds with dependent changes will have the same version number. (For SEPG feature
 * builds, the version is derived from the git branch name.) If no related package is found then it will install either
 * the version specified on the command line (if `package@version` format is provided), or the version specified in
 * official-build.props (if `groupId:artifactId:npmPackageName` format is provided).
 * Relevant environment variables:
 * - `RE_BUILD_TYPE` - build type from SEPG.
 * - `VERSION` - version from SEPG.
 */

const { argv, env } = require('process');
const { getNpmPackages, install, useSnapshotRegistry } = require('../lib/install');

const snapshotRegistry = 'https://svsartifactory.swinfra.net/artifactory/api/npm/saas-npm-dev-local';
const versionRegex = /^\d+\.\d+\.\d+-(.+)-SNAPSHOT$/;
const packageRegex = /^.+@\d+\.\d+\.\d+/;

if (!env['RE_BUILD_TYPE'] || env['RE_BUILD_TYPE'] === 'continuous') {

    const packages = getNpmPackages(argv.slice(2));

    // Attempt to install packages using this build's version, falling back on the default snapshot if not present.
    useSnapshotRegistry(snapshotRegistry, () => {
        for (const package of packages) {

            // Get package name with the same version as this build
            const featurePackage = getPackageForCurrentFeature(package);

            try {
                // Attempt to install the feature package if it exists
                install(featurePackage);
            } catch (error) {
                // Otherwise install the normal dependency
                install(package);
            }
        }
    })
}

/**
 * Get a package name with the version affix replaced by the current build version affix.
 * E.g. `@ux-aspects/ux-aspects@1.8.8-SNAPSHOT` => `@ux-aspects/ux-aspects@1.8.8-new-feature-SNAPSHOT`.
 * @param {string} package Package name including version, e.g. `@ux-aspects/ux-aspects@1.8.8-SNAPSHOT`.
 */
function getPackageForCurrentFeature(package) {

    const versionMatch = versionRegex.exec(env['VERSION']);
    if (versionMatch) {
        const packageMatch = packageRegex.exec(package);
        if (packageMatch) {
            return `${packageMatch[0]}-${versionMatch[1]}-SNAPSHOT`;
        }
    }

    return package;
}
