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

package software.aws.solution.clickstream.common;

import lombok.*;

@Getter
@AllArgsConstructor
public class ExtraParams {
    Long ingestTimestamp;
    @Setter
    Long uploadTimestamp;
    String rid;
    String projectId;
    String inputFileName;
    String uri;
    String ua;
    String ip;
    String appId;

    public static ExtraParamsBuilder builder() {
        return new ExtraParamsBuilder();
    }

    public static class ExtraParamsBuilder {
        private Long ingestTimestamp;
        private Long uploadTimestamp;
        private String rid;
        private String projectId;
        private String inputFileName;
        private String uri;
        private String ua;
        private String ip;

        private String appId;

        public ExtraParamsBuilder ingestTimestamp(final Long ingestTimestamp) {
            this.ingestTimestamp = ingestTimestamp;
            return this;
        }

        public ExtraParamsBuilder uploadTimestamp(final Long uploadTimestamp) {
            this.uploadTimestamp = uploadTimestamp;
            return this;
        }

        public ExtraParamsBuilder rid(final String rid) {
            this.rid = rid;
            return this;
        }

        public ExtraParamsBuilder projectId(final String projectId) {
            this.projectId = projectId;
            return this;
        }

        public ExtraParamsBuilder inputFileName(final String inputFileName) {
            this.inputFileName = inputFileName;
            return this;
        }

        public ExtraParamsBuilder uri(final String uri) {
            this.uri = uri;
            return this;
        }

        public ExtraParamsBuilder ua(final String ua) {
            this.ua = ua;
            return this;
        }

        public ExtraParamsBuilder ip(final String ip) {
            this.ip = ip;
            return this;
        }

        public ExtraParamsBuilder appId(final String appId) {
            this.appId = appId;
            return this;
        }

        public ExtraParams build() {
            return new ExtraParams(ingestTimestamp, uploadTimestamp, rid, projectId, inputFileName, uri, ua, ip, appId);
        }
    }
}
