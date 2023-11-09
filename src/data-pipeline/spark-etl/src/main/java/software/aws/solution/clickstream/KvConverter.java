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
import org.apache.spark.sql.Column;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.api.java.UDF1;
import org.apache.spark.sql.catalyst.expressions.GenericRow;
import org.apache.spark.sql.expressions.UserDefinedFunction;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructField;
import org.apache.spark.sql.types.StructType;

import java.util.List;
import java.util.ArrayList;
import java.util.Iterator;

import static org.apache.spark.sql.functions.udf;
import static software.aws.solution.clickstream.ContextUtil.DEBUG_LOCAL_PROP;
import static software.aws.solution.clickstream.DatasetUtil.DATA;
import static software.aws.solution.clickstream.DatasetUtil.DOUBLE_VALUE;
import static software.aws.solution.clickstream.DatasetUtil.FLOAT_VALUE;
import static software.aws.solution.clickstream.DatasetUtil.INT_VALUE;
import static software.aws.solution.clickstream.DatasetUtil.KEY;
import static software.aws.solution.clickstream.DatasetUtil.MAX_PARAM_STRING_VALUE_LEN;
import static software.aws.solution.clickstream.DatasetUtil.STRING_VALUE;
import static software.aws.solution.clickstream.DatasetUtil.VALUE;
import static software.aws.solution.clickstream.ETLRunner.DEBUG_LOCAL_PATH;


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
            ValueTypeResult result = getValueTypeResult(attrName, attrValueNode);

            list.add(new GenericRow(
                    new Object[]{
                            attrName,
                            new GenericRow(
                                    new Object[]{
                                            result.doubleValue,
                                            null,
                                            result.longValue,
                                            result.stringValue,
                                    })
                    }
            ));
        }
        return list.toArray(new GenericRow[]{});

    }

    public static ValueTypeResult getValueTypeResult(final String attrName, final JsonNode attrValueNode) {
        Double doubleValue = null;
        Long longValue = null;
        String stringValue = null;
        try {
            if (attrValueNode.isLong() || attrValueNode.isInt() || attrValueNode.isBigInteger() || attrValueNode.isIntegralNumber()) {
                longValue = attrValueNode.asLong();
            } else if (attrValueNode.isDouble() || attrValueNode.isFloat() || attrValueNode.isFloatingPointNumber() || attrValueNode.isBigDecimal()) {
                doubleValue = attrValueNode.asDouble();
            } else if (attrValueNode.isArray() || attrValueNode.isObject()){
                stringValue = attrValueNode.toString();
            } else {
                stringValue = attrValueNode.asText();
            }
        } catch (Exception e) {
            log.warn("Error when parse attrName: " + attrName + ", attrValueNode: " +  attrValueNode.asText() + ", errorMessage: " + e.getMessage());
            stringValue = attrValueNode.asText();
        }

        if (stringValue!= null && stringValue.length() > MAX_PARAM_STRING_VALUE_LEN) {
            stringValue = stringValue.substring(0, MAX_PARAM_STRING_VALUE_LEN);
        }
        return new ValueTypeResult(doubleValue, longValue, stringValue);
    }

    public static class ValueTypeResult {
        public final Double doubleValue;
        public final Long longValue;
        public final String stringValue;

        public ValueTypeResult(final Double doubleValue, final Long longValue, final String stringValue) {
            this.doubleValue = doubleValue;
            this.longValue = longValue;
            this.stringValue = stringValue;
        }
    }

    public Dataset<Row> transform(final Dataset<Row> dataset, final String fromColNameInData, final String toColName) {
        Column fromCol = dataset.col(DATA).getField(fromColNameInData);
        return transform(dataset, fromCol, toColName, new ArrayList<>());
    }

    public Dataset<Row> transform(final Dataset<Row> dataset, final Column fromCol, final String toColName) {
        return transform(dataset, fromCol, toColName, new ArrayList<>());
    }

    public Dataset<Row> transform(final Dataset<Row> dataset, final Column fromCol, final String toColName, final List<String> excludeAttributes) {

        StructType valueType = DataTypes.createStructType(new StructField[]{
                DataTypes.createStructField(DOUBLE_VALUE, DataTypes.DoubleType, true),
                DataTypes.createStructField(FLOAT_VALUE, DataTypes.FloatType, true),
                DataTypes.createStructField(INT_VALUE, DataTypes.LongType, true),
                DataTypes.createStructField(STRING_VALUE, DataTypes.StringType, true),
        });

        UserDefinedFunction convertStringToKeyValueUdf = udf(convertJsonStringToKeyValue(excludeAttributes), DataTypes.createArrayType(
                DataTypes.createStructType(
                        new StructField[]{
                                DataTypes.createStructField(KEY, DataTypes.StringType, true),
                                DataTypes.createStructField(VALUE, valueType, true),
                        }
                )));
        Dataset<Row> convertedKeyValueDataset = dataset.withColumn(toColName,
                convertStringToKeyValueUdf.apply(fromCol));

        boolean debugLocal = Boolean.parseBoolean(System.getProperty(DEBUG_LOCAL_PROP));
        if (debugLocal) {
            convertedKeyValueDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/KvConverter-" + toColName + "/");
        }
        return convertedKeyValueDataset;
    }

}
