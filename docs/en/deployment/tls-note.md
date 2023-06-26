By default, this deployment uses TLSv1.0 and TLSv1.1 in CloudFront. However, we recommend that you manually configure CloudFront to use the more secure TLSv1.2/TLSv1.3 and apply for a certificate and custom domain to enable this. We highly recommend that you update your TLS configuration and cipher suite selection according to the following recommendations:

  - **Transport Layer Security Protocol**: Upgrade to TLSv1.2 or higher
  - **Key Exchange**: ECDHE
  - **Block Cipher Mode of Operation**: GCM
  - **Authentication**: ECDSA
  - **Encryption Cipher**: AES256
  - **Message Authentication**: SHA(256/384/any hash function except for SHA1)

Such as TLSv1.2_2021 can meet the above recommendations.