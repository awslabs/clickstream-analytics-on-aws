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

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import software.aws.solution.clickstream.common.exception.*;
import software.aws.solution.clickstream.exception.ExecuteTransformerException;

import java.io.IOException;

public class ExceptionTest {
    @Test
    public void testExecuteTransformerExceptionIsRuntimeException() {
        Exception ee = null;
        try {
            throw new ExecuteTransformerException(new IOException());
        } catch (RuntimeException e) {
            ee = e;
        }
        Assertions.assertNotNull(ee);
    }

    @Test
    public void testExtractDataExceptionIsRuntimeException() {
        Exception ee = null;
        try {
            throw new ExtractDataException(new IOException());
        } catch (RuntimeException e) {
            ee = e;
        }
        Assertions.assertNotNull(ee);
    }

    @Test
    public void testExecuteTransformerExceptionWithStringMessage() {
        Exception ee = null;
        try {
            throw new ExecuteTransformerException("error");
        } catch (RuntimeException e) {
            ee = e;
        }
        Assertions.assertNotNull(ee);
    }
}
