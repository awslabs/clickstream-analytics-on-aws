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

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.api.java.UDF1;
import org.apache.spark.sql.catalyst.expressions.GenericRow;
import org.apache.spark.sql.expressions.UserDefinedFunction;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructField;
import org.apache.spark.sql.types.StructType;
import org.jetbrains.annotations.NotNull;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.udf;
import static org.apache.spark.sql.functions.get_json_object;

import static software.aws.solution.clickstream.ETLRunner.DEBUG_LOCAL_PATH;
import static software.aws.solution.clickstream.Transformer.DOUBLE_VALUE;
import static software.aws.solution.clickstream.Transformer.FLOAT_VALUE;
import static software.aws.solution.clickstream.Transformer.INT_VALUE;
import static software.aws.solution.clickstream.Transformer.STRING_VALUE;
@Slf4j
public class UserPropertiesConverter {

    public static final String VALUE = "value";

    private static UDF1<String, Row[]> convertJsonStringToKeyValue() {
        return (String value) -> {
            try {
                return getUserPropertiesGenericRows(value);
            } catch (Exception e) {
                return null;
            }
        };
    }

    private static UDF1<String, Row> convertUserLtv() {
        return (String value) -> {
            try {
                return getUserLtvGenericRow(value);
            } catch (Exception e) {
                return null;
            }
        };
    }

    @NotNull
    private static GenericRow[] getUserPropertiesGenericRows(final String value) throws JsonProcessingException {
        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode jsonNode = objectMapper.readTree(value);
        List<GenericRow> list = new ArrayList<>();
        for (Iterator<String> it = jsonNode.fieldNames(); it.hasNext();) {
            String attrName = it.next();
            JsonNode attrValueNode = jsonNode.get(attrName);

            if (attrName.startsWith("_user_ltv_")) {
                continue;
            }

            String attrValue = attrValueNode.get(VALUE).asText();
            Long setTimestamp = attrValueNode.get("set_timestamp").asLong(0L);

            Double doubleValue = null;
            Long longValue = null;
            String stringValue = null;
            Long setTimestampMicros = setTimestamp * 1000L;

            if (attrValue.matches("^\\d+$")) {
                longValue = Long.parseLong(attrValue);
            } else if (attrValue.matches("^[\\d.]+$")) {
                doubleValue = Double.parseDouble(attrValue);
            } else {
                stringValue = attrValue;
            }

            list.add(new GenericRow(
                    new Object[]{
                            attrName,
                            new GenericRow(
                                    new Object[]{
                                            doubleValue,
                                            null,
                                            longValue,
                                            stringValue,
                                            setTimestampMicros,
                                    })
                    }
            ));
        }
        if (list.size() > 0) {
            return list.toArray(new GenericRow[]{});
        } else {
            return null;
        }
    }

    @NotNull
    private static GenericRow getUserLtvGenericRow(final String value) throws JsonProcessingException {
        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode jsonNode = objectMapper.readTree(value);
        Double revenue = null;
        String currency = null;

        for (Iterator<String> it = jsonNode.fieldNames(); it.hasNext();) {
            String attrName = it.next();
            if (!attrName.startsWith("_user_ltv_")) {
                continue;
            }
            JsonNode attrValueNode = jsonNode.get(attrName);
            if ("_user_ltv_revenue".equals(attrName)) {
                revenue = attrValueNode.get(VALUE).asDouble();
            }
            if ("_user_ltv_currency".equals(attrName)) {
                currency = attrValueNode.get(VALUE).asText();
            }
        }
        if (revenue != null) {
            return new GenericRow(new Object[]{
                    revenue,
                    currency
            });
        }
        return null;
    }

    public Dataset<Row> transform(final Dataset<Row> dataset) {

        StructType valueType = DataTypes.createStructType(new StructField[]{
                DataTypes.createStructField(DOUBLE_VALUE, DataTypes.DoubleType, true),
                DataTypes.createStructField(FLOAT_VALUE, DataTypes.FloatType, true),
                DataTypes.createStructField(INT_VALUE, DataTypes.LongType, true),
                DataTypes.createStructField(STRING_VALUE, DataTypes.StringType, true),
                DataTypes.createStructField("set_timestamp_micros", DataTypes.LongType, true),
        });


        UserDefinedFunction convertStringToKeyValueUdf = udf(convertJsonStringToKeyValue(), DataTypes.createArrayType(
                DataTypes.createStructType(
                        new StructField[]{
                                DataTypes.createStructField("key", DataTypes.StringType, true),
                                DataTypes.createStructField(VALUE, valueType, true),
                        }
                )));

        UserDefinedFunction userLtvUdf = udf(convertUserLtv(),
                DataTypes.createStructType(
                        new StructField[]{
                                DataTypes.createStructField("revenue", DataTypes.DoubleType, true),
                                DataTypes.createStructField("currency", DataTypes.StringType, true),
                        }
                ));

        Dataset<Row> userDataset1 = dataset.withColumn("user_properties",
                convertStringToKeyValueUdf.apply(dataset.col("data").getField("user")));

        Dataset<Row> userDataset2 = userDataset1.withColumn("user_ltv",
                userLtvUdf.apply(dataset.col("data").getField("user")));

        Dataset<Row> userDataset3 = userDataset2
                .withColumn("user_id", get_json_object(col("data").getField("user"), "$._user_id.value"))
                .withColumn("user_first_touch_timestamp",
                        get_json_object(col("data").getField("user"), "$._user_first_touch_timestamp.value").cast(DataTypes.LongType));

        if (ContextUtil.isDebugLocal()) {
            userDataset3.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/UserPropertiesConverter/");
        }
        return userDataset3;
    }
}
