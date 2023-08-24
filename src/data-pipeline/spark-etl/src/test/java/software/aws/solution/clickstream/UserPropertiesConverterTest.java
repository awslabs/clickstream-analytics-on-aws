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

import static java.util.Objects.requireNonNull;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static software.aws.solution.clickstream.ContextUtil.DEBUG_LOCAL_PROP;

public class UserPropertiesConverterTest extends BaseSparkTest {
    @Test
    public void should_convert_user_data() {
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        UserPropertiesConverter transformer = new UserPropertiesConverter();
        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/data_cleaned.json")).getPath());
        Dataset<Row> converteDataset = transformer.transform(dataset);
        converteDataset.printSchema();
        Row row = converteDataset.first();

        /*
         "user_properties": [
           {
             "key": "_user_id",
             "value": {
               "int_value": "312121",
               "set_timestamp_micros": 1667877566697000
             }
           },
           {
             "key": "_user_name",
             "value": {
               "string_value": "xiaowei",
               "set_timestamp_micros": 1667877566697000
             }
           },
           {
             "key": "_user_age",
             "value": {
               "int_value": "20",
               "set_timestamp_micros": 1667877566697000
             }
           },
           {
             "key": "_user_first_touch_timestamp",
             "value": {
               "int_value": "1667877267895",
               "set_timestamp_micros": 1667877566697000
             }
           }
         ],

         "user_ltv": {
           "revenue": 123.45,
           "currency": "USD"
         }
         */

        Row ltv = row.getStruct(row.fieldIndex("user_ltv"));
        String currency = ltv.getString(ltv.fieldIndex("currency"));
        Double revenue = ltv.getDouble(ltv.fieldIndex("revenue"));

        assertEquals("USD", currency);
        assertEquals(123.45, revenue);

        int seqLen = row.getSeq(row.fieldIndex("user_properties")).length();
        assertEquals(4, seqLen);

        Iterator<Object> it = row.getSeq(row.fieldIndex("user_properties")).iterator();
        Row firstItem = (Row) it.next();
        String firstKey = firstItem.getString(firstItem.fieldIndex("key"));
        Row valueItem = firstItem.getStruct(firstItem.fieldIndex("value"));

        Long intValue = valueItem.getLong(valueItem.fieldIndex("int_value"));
        assertEquals(312121L, intValue);
        assertEquals("_user_id", firstKey);

    }


    @Test
    public void should_convert_no_user_data() {
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        UserPropertiesConverter transformer = new UserPropertiesConverter();
        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/data_cleaned_no_user.json")).getPath());
        Dataset<Row> converteDataset = transformer.transform(dataset);
        converteDataset.printSchema();
        assertEquals(1, converteDataset.count());
    }
}
