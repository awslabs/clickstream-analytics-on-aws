<template>
  <div class='list row'>
    <div class='col-md-12'>
      <h4>Upload file to S3 using AWS SDK</h4>
      <div class='flex-container'>
        <input type='file' ref='fileInput' />
        <button class='btn btn-sm btn-success' @click='uploadFile'>
          Upload
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';

const REGION = 'your bucket region';

const s3Client = new S3Client({
  region: REGION,
  credentials: fromCognitoIdentityPool({
    clientConfig: { region: REGION },
    identityPoolId: 'your identityPoolId with S3 PutObject permission'
  })
});

export default {
  name: 'upload_file',
  methods: {
    async uploadFile() {
      const fileInput = this.$refs.fileInput;
      if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        console.log(file);
        const command = new PutObjectCommand({
          Bucket: 'your S3 bucket',
          Key: file.name,
          Body: file
        });
        try {
          const response = await s3Client.send(command);
          console.log(response);
          if (response.$metadata.httpStatusCode === 200) {
            console.log('upload success');
          }
        } catch (err) {
          console.error(err);
        }
      }
    }
  }
};
</script>

<style scoped>
.flex-container {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  padding-top: 30px;
  gap: 30px;
}

input {
  flex: 1;
}

.list {
  text-align: left;
  max-width: 750px;
  margin: auto;
}
</style>
