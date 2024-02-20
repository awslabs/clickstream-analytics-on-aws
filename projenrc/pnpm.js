const path = require("path");
const { Component, YamlFile } = require("projen");
// Custom projen component that generates pnpm-workspace.yaml
// and defines the monorepo packages based on the subprojects.
class PnpmWorkspace extends Component {
  constructor(rootProject) {
    super(rootProject);

    new YamlFile(rootProject, "pnpm-workspace.yaml", {
      obj: {
        packages: rootProject.subprojects.map((project) =>
          path.relative(rootProject.outdir, project.outdir)
        ),
      },
    });
  }
}
module.exports = PnpmWorkspace;
