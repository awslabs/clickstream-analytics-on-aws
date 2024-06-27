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

package software.aws.solution.clickstream.flink;

import org.apache.flink.api.connector.sink2.Sink;
import org.apache.flink.api.connector.sink2.SinkWriter;

import java.io.IOException;

public class DiscardSink implements Sink<String> {
    @Override
    public DiscardSinkWriter createWriter(final InitContext context) {
        return new DiscardSinkWriter();
    }
    public static class DiscardSinkWriter implements SinkWriter<String> {
        @Override
        public void write(final String element, final Context context) {
            // Discard the element
        }
        @Override
        public void flush(final boolean endOfInput) throws IOException, InterruptedException {

        }
        @Override
        public void close() {
            // Do nothing
        }
    }
}
