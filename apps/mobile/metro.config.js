const { getDefaultConfig } = require("expo/metro-config")
const { withNativeWind } = require("nativewind/metro")
const path = require("path")

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, "../..")

const config = getDefaultConfig(projectRoot)

// This is a pnpm workspace — deps are hoisted into the repo-root
// node_modules/.pnpm store, not apps/mobile/node_modules, so Metro needs to
// watch the workspace root and look up modules there too. Hierarchical
// lookup must stay ON (the default) — pnpm symlinks each package's own
// dependencies into that package's local node_modules, and Metro only
// finds those by walking up through each node_modules along the require
// chain. Turning it off breaks resolution of anything not hoisted to the
// very top (which, under pnpm's strict linking, is most transitive deps).
config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
]

module.exports = withNativeWind(config, { input: "./global.css" })
