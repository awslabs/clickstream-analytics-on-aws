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

package software.aws.solution.clickstream.common.model;

import lombok.*;
import lombok.extern.slf4j.*;

import java.sql.Date;
import java.sql.*;
import java.util.*;

@Slf4j
@Setter
@Getter
public class ClickstreamUser {
    private Timestamp eventTimestamp;
    private String userPseudoId;
    private String userId;
    private Map<String, ClickstreamUserPropValue> userProperties;
    private Long firstTouchTimeMsec;
    private Date firstVisitDate;
    private String firstReferrer;
    private String firstTrafficSource;
    private String firstTrafficMedium;
    private String firstTrafficCampaign;
    private String firstTrafficContent;
    private String firstTrafficTerm;
    private String firstTrafficCampaignId;
    private String firstTrafficClidPlatform;
    private String firstTrafficClid;
    private String firstTrafficChannelGroup;
    private String firstTrafficCategory;
    private String firstAppInstallSource;
    private Map<String, String> processInfo;
    private String appId;
    private String eventName;

}
