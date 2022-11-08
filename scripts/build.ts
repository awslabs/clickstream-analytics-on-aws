import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { CodeBuildClient, BuildArtifacts, StartBuildCommand, BatchGetBuildsCommand } from '@aws-sdk/client-codebuild';
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { readFileSync, writeFile } from 'fs';

const config = {
  region: process.env.AWS_DEFAULT_REGION,
};
const s3 = new S3Client(config);
const codebuild = new CodeBuildClient(config);

const build = async() => {
    
    const sourceFileName = process.argv[2];
    const s3PutCommand = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: `source/${sourceFileName}`,
      Body: readFileSync(`/tmp/${sourceFileName}`),
    });
    await s3.send(s3PutCommand);
    
    console.log('upload source file successed.');
    
    const startBuildCommand = new StartBuildCommand({
      projectName: process.env.PROJECT_NAME,
      sourceTypeOverride: 'S3',
      sourceLocationOverride: `${process.env.BUCKET_NAME}/source/${sourceFileName}`,
    });
    const resp = await codebuild.send(startBuildCommand);
    const buildId = resp.build!.id!;
    
    loop: do {
      const getBuildsCommand = new BatchGetBuildsCommand({
        ids: [ buildId ],
      });
      const buildsResp = await codebuild.send(getBuildsCommand);
      const build = buildsResp.builds![0];
      
      switch(build?.buildStatus) {
        case 'IN_PROGRESS':
          await new Promise(f => setTimeout(f, 60000));
          continue;
        case 'SUCCEEDED':
          for(const artifact of build.secondaryArtifacts!) {
            await downloadArtifact(artifact);
          }
          break loop;
        default:
          break;
      }
      const sts = new STSClient(config);
      const getCallerCommand = new GetCallerIdentityCommand({});
      const stsResp = await sts.send(getCallerCommand);
      throw new Error(`Build ${buildId} is ${build.buildStatus}. \n
      See https://${config.region}.console.aws.amazon.com/codesuite/codebuild/${stsResp.Account}/projects/${process.env.PROJECT_NAME}/build/${process.env.PROJECT_NAME}%3A${buildId}/`);
    } while(true);
}

const downloadArtifact = async(artifact?: BuildArtifacts) => {
  if (artifact) {
    console.log(`Downloading artifact from ${artifact.location}`);
    const s3Path = artifact.location!.split(':::')[1];
    const [bucket, ...path] = s3Path.split('/');
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: path.join('/'),
    });
    const obj = await s3.send(command);
    const buffer = await obj.Body!.transformToByteArray();
    const output = `output/${artifact.artifactIdentifier}.zip`;
    writeFile(output, buffer, function(err) {
      if (err) {
          return console.error(err);
      }
      console.log(`Artifact ${artifact.location} was downloaded as ${output}`);
    });
  }
}

build();