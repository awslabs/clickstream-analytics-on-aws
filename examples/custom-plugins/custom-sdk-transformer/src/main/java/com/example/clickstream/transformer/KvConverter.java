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

package com.example.clickstream.transformer;


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

import static org.apache.spark.sql.functions.udf;
import static com.example.clickstream.transformer.Constants.DEBUG_LOCAL_PATH;

@Slf4j
public class KvConverter {
    private static UDF1<String, Row[]> convertJsonStringToKeyValue(final List<String> excludeAttributes) {
        return (String value) -> {
            try {
                return getGenericRows(value, excludeAttributes);
            } catch (Exception e) {
                return null;
            }
        };
    }

    @NotNull
    private static GenericRow[] getGenericRows(final String value, final List<String> excludeAttributes) throws JsonProcessingException {
        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode jsonNode = objectMapper.readTree(value);
        List<GenericRow> list = new ArrayList<>();
        for (Iterator<String> it = jsonNode.fieldNames(); it.hasNext();) {
            String attrName = it.next();
            if (excludeAttributes.contains(attrName)) {
                continue;
            }
            JsonNode attrValueNode = jsonNode.get(attrName);
            String attrValue = attrValueNode.asText();

            Double doubleValue = null;
            Long longValue = null;
            String stringValue = null;

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

    public Dataset<Row> transform(final Dataset<Row> dataset, final String fromColName, final String toColName) {
        return transform(dataset, fromColName, toColName, new ArrayList<>());
    }

    public Dataset<Row> transform(final Dataset<Row> dataset, final String fromColName, final String toColName, final List<String> excludeAttributes) {

        StructType valueType = DataTypes.createStructType(new StructField[]{
            DataTypes.createStructField("double_value", DataTypes.DoubleType, true),
            DataTypes.createStructField("float_value", DataTypes.FloatType, true),
            DataTypes.createStructField("int_value", DataTypes.LongType, true),
            DataTypes.createStructField("string_value", DataTypes.StringType, true),
        });

        UserDefinedFunction convertStringToKeyValueUdf = udf(convertJsonStringToKeyValue(excludeAttributes), DataTypes.createArrayType(
                DataTypes.createStructType(
                        new StructField[]{
                                DataTypes.createStructField("key", DataTypes.StringType, true),
                                DataTypes.createStructField("value", valueType, true),
                        }
                )));
        Dataset<Row> convertedKeyValueDataset = dataset.withColumn(toColName,
                convertStringToKeyValueUdf.apply(dataset.col("data").getField(fromColName)));

        boolean debugLocal = Boolean.valueOf(System.getProperty("debug.local"));
        if (debugLocal) {
            convertedKeyValueDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/KvConverter-" + toColName + "/");
        }
        return convertedKeyValueDataset;
    }

}
