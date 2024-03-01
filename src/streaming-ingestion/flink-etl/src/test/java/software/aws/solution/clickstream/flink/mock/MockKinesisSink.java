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


package software.aws.solution.clickstream.flink.mock;

import org.apache.flink.api.connector.sink2.Sink;
import org.apache.flink.api.connector.sink2.SinkWriter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class MockKinesisSink implements Sink<String> {
    public static Map<String, List<String>> appValues =new HashMap<>();
    private String appId;
    public MockKinesisSink(String appId) {
        this.appId = appId;
    }

    @Override
    public SinkWriter<String> createWriter(InitContext context) throws IOException {
        return new SinkWriter<String>() {
            @Override
            public void write(String element, Context context) throws IOException, InterruptedException {
                synchronized (MockKinesisSink.class) {
                    if (!appValues.containsKey(appId)) {
                        appValues.put(appId, new ArrayList<>());
                    }
                    appValues.get(appId).add(element);
                }
            }

            @Override
            public void flush(boolean endOfInput) throws IOException, InterruptedException {

            }

            @Override
            public void close() throws Exception {

            }
        };
    }
}
