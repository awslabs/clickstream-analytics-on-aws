<template>
  <div class="list row">
    <div class="col-md-12">
      <h4>Upload file to Amazon S3 using AWS SDK</h4>
      <div class="flex-container">
        <input type="file" ref="fileInput" @change="handleFileChange" />
        <button class="btn btn-sm btn-success" @click="uploadFile">
          {{ isLoading ? 'Uploading...' : 'Upload' }}
        </button>
      </div>
      <div
        v-if="uploadResult === 'success' && !isLoading"
        class="success-message"
      >
        File uploaded successfully!
      </div>
      <div v-if="uploadResult === 'fail' && !isLoading" class="fail-message">
        File uploaded failed!
      </div>
    </div>
  </div>
</template>

<script>
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';

const REGION = process.env.VUE_APP_S3_BUCKET_REGION;

const s3Client = new S3Client({
  region: REGION,
  credentials: fromCognitoIdentityPool({
    clientConfig: { region: REGION },
    identityPoolId: process.env.VUE_APP_IDENTITY_POOL_ID,
  }),
});

export default {
  name: 'upload_file',
  data() {
    return {
      isLoading: false,
      uploadResult: '',
    };
  },
  methods: {
    handleFileChange() {
      this.uploadResult = '';
    },
    async uploadFile() {
      this.isLoading = true;
      this.uploadResult = '';
      const fileInput = this.$refs.fileInput;
      if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        console.log(file);
        const command = new PutObjectCommand({
          Bucket: process.env.VUE_APP_S3_BUCKET_NAME,
          Key: file.name,
          Body: file,
        });
        try {
          const response = await s3Client.send(command);
          console.log(response);
          if (response.$metadata.httpStatusCode === 200) {
            console.log('upload success');
            this.uploadResult = 'success';
          }
        } catch (err) {
          console.error(err);
          this.uploadResult = 'fail';
        } finally {
          this.isLoading = false; // Reset loading state
        }
      }
    },
  },
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

.success-message {
  color: green;
  margin-top: 10px;
}

.fail-message {
  color: red;
  margin-top: 10px;
}
</style>
