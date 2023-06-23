# 将 SSL 证书上传到 IAM

通过运行类似以下的 AWS CLI 命令 `upload-server-certificate` 来上传 SSL 证书：

```
aws iam upload-server-certificate --path /cloudfront/ \
--server-certificate-name YourCertificate \
--certificate-body file://Certificate.pem \
--certificate-chain file://CertificateChain.pem \
--private-key file://PrivateKey.pem
```

替换文件名和 YourCertificate 为您上传文件和证书的名称。
在 API 请求中的 certificate-body、certificate-chain 和 private-key 参数中，必须使用 `file://` 前缀。
否则，请求将失败，并显示 `MalformedCertificate: Unknown` 错误消息。

!!! note "注意"

     您必须使用 --path 选项指定一个路径。该路径必须以 /cloudfront 开头，并且必须包含尾部斜杠（例如，/cloudfront/test/）。

证书上传完成后，AWS 命令 `upload-server-certificate` 将返回已上传证书的元数据，包括证书的 Amazon 资源名称（ARN）、友好名称、标识符（ID）和到期日期。

要查看已上传的证书，请运行 AWS CLI 命令 `list-server-certificates`：

```
aws iam list-server-certificates
```

有关更多信息，请参阅 [上传服务器证书](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_server-certs.html#upload-server-certificate){target='_blank'} 至 IAM。