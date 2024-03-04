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

import org.apache.flink.streaming.api.functions.source.SourceFunction;
import org.testcontainers.shaded.org.apache.commons.io.IOUtils;

import java.io.IOException;
import java.util.List;
import java.util.Objects;

public class SourceFunctionMock implements SourceFunction<String> {
    private final List<String> dataList;

    public SourceFunctionMock(String dataFilePath) {
        try {
            this.dataList = IOUtils.readLines(Objects.requireNonNull(getClass().getResourceAsStream(dataFilePath)), "UTF-8");
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
    @Override
    public void run(SourceContext<String> ctx) throws Exception {
        for(String data : dataList) {
            ctx.collect(data);
        }
        ctx.close();
    }

    @Override
    public void cancel() {

    }
}
