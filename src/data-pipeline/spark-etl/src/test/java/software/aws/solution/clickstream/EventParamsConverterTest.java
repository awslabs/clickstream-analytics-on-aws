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

package software.aws.solution.clickstream;

import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.junit.jupiter.api.Test;
import scala.collection.Iterator;
import software.aws.solution.clickstream.transformer.*;

import static java.util.Objects.requireNonNull;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static software.aws.solution.clickstream.util.ContextUtil.DEBUG_LOCAL_PROP;

public class EventParamsConverterTest extends BaseSparkTest {

    @Test
    public void should_convert_attributes_data() {
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        EventParamsConverter transformer = new EventParamsConverter();
        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/data_cleaned.json")).getPath());
        Dataset<Row> converteDataset = transformer.transform(dataset);
        converteDataset.printSchema();
        Row row = converteDataset.first();

        int seqLen = row.getSeq(row.fieldIndex("event_params")).length();
        assertEquals(11, seqLen);

        Iterator<Object> it = row.getSeq(row.fieldIndex("event_params")).iterator();
        Row firstItem = (Row) it.next();
        String firstKey = firstItem.getString(firstItem.fieldIndex("key"));
        Row valueItem = firstItem.getStruct(firstItem.fieldIndex("value"));

        String value = valueItem.getString(valueItem.fieldIndex("string_value"));
        assertEquals("V001", value);
        assertEquals("_device_vendor_id", firstKey);

    }

    @Test
    public void should_convert_no_attributes_data() {
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        EventParamsConverter transformer = new EventParamsConverter();
        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/data_cleaned_no_attributes.json")).getPath());
        Dataset<Row> converteDataset = transformer.transform(dataset);
        converteDataset.printSchema();

        assertEquals(1, converteDataset.count());
    }
}
