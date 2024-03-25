/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

interface VersionProps {
  readonly full: string;
  readonly short: string;
  readonly buildId: string;
};

export class SolutionInfo {

  static SOLUTION_ID = 'SO0219';
  static SOLUTION_NAME = 'Clickstream Analytics on AWS';
  static SOLUTION_SHORT_NAME = 'Clickstream';
  static SOLUTION_VERSION = process.env.SOLUTION_VERSION || 'v1.2.0';
  static SOLUTION_VERSION_DETAIL = versionDetail(SolutionInfo.SOLUTION_VERSION);
  static SOLUTION_VERSION_SHORT = parseVersion(SolutionInfo.SOLUTION_VERSION).short;
  static DESCRIPTION = `(${SolutionInfo.SOLUTION_ID}) ${SolutionInfo.SOLUTION_NAME} ${SolutionInfo.SOLUTION_VERSION_DETAIL}`;
  static SOLUTION_TYPE = 'AWS-Solutions';
}

export class SolutionVersion {
  public static readonly V_1_0_0 = SolutionVersion.Of('v1.0.0');
  public static readonly V_1_0_1 = SolutionVersion.Of('v1.0.1');
  public static readonly V_1_0_2 = SolutionVersion.Of('v1.0.2');
  public static readonly V_1_0_3 = SolutionVersion.Of('v1.0.3');
  public static readonly V_1_1_0 = SolutionVersion.Of('v1.1.0');
  public static readonly V_1_1_1 = SolutionVersion.Of('v1.1.1');
  public static readonly V_1_1_2 = SolutionVersion.Of('v1.1.2');
  public static readonly V_1_1_3 = SolutionVersion.Of('v1.1.3');
  public static readonly V_1_1_4 = SolutionVersion.Of('v1.1.4');
  public static readonly V_1_1_5 = SolutionVersion.Of('v1.1.5');
  public static readonly V_1_1_6 = SolutionVersion.Of('v1.1.6');
  public static readonly V_1_2_0 = SolutionVersion.Of('v1.2.0');
  public static readonly ANY = SolutionVersion.Of('*');

  /**
   * Create a new SolutionVersion with an arbitrary version.
   *
   * @param fullVersion the full version string,
   *   for example "v1.2.0-dev-main-202402080321-9d2dae7c"
   */
  public static Of(fullVersion: string): SolutionVersion {
    return new SolutionVersion(fullVersion);
  }

  /** The full version string, for example:
   * "v1.2.0-dev-main-202402080321-9d2dae7c"
   * "v1.1.5-202403071513"
   * "v1.1.0"
   * */
  public readonly fullVersion: string;
  /** The short version string, for example, "v1.1.0". */
  public readonly shortVersion: string;
  /** The build id string, for example, "dev-main-202402080321-9d2dae7c". */
  public readonly buildId: string;

  private constructor(fullVersion: string) {
    if (fullVersion === '*') {
      this.fullVersion = fullVersion;
      this.shortVersion = fullVersion;
      this.buildId = '';
    } else {
      this.fullVersion = fullVersion;
      this.shortVersion = parseVersion(fullVersion).short;
      this.buildId = parseVersion(fullVersion).buildId ?? '';
    }
  }

  public equalTo(version: SolutionVersion): boolean {
    return this.shortVersion === version.shortVersion;
  }

  public greaterThan(version: SolutionVersion): boolean {
    return this.shortVersion > version.shortVersion;
  }

  public greaterThanOrEqualTo(version: SolutionVersion): boolean {
    return this.shortVersion >= version.shortVersion;
  }

  public lessThan(version: SolutionVersion): boolean {
    return this.shortVersion < version.shortVersion;
  }

  public lessThanOrEqualTo(version: SolutionVersion): boolean {
    return this.shortVersion <= version.shortVersion;
  }
}

export function parseVersion(version: string): VersionProps {
  const versionPattern = /^(v\d+\.\d+\.\d+)-?(.*)/;
  const match = version.match(versionPattern);

  if (match) {
    return {
      full: version,
      short: match[1],
      buildId: match[2],
    };
  }

  throw new Error(`Illegal version string '${version}'.`);
}

export function versionDetail(version: string): string {
  const { short, buildId } = parseVersion(version);
  const buildInfo = buildId ? `(Build ${buildId})` : '';

  return `(Version ${short})${buildInfo}`;
}
