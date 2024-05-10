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

package software.aws.solution.clickstream.common;
import java.util.HashMap;
import java.util.Map;

public class Cache<T> {
    private final Map<String, T> dataCached;
    private final int size;

    public Cache() {
        this(Integer.MAX_VALUE/2);
    }
    public Cache(final int size) {
        this.dataCached = new HashMap<>(1024 * 1024);
        this.size = size;
    }
    public boolean containsKey(final String key) {
        return dataCached.containsKey(key);
    }
    public T get(final String key) {
        return dataCached.get(key);
    }

    public void put(final String key, final T data) {
        if (dataCached.size() >= size) {
            dataCached.remove(dataCached.keySet().iterator().next());
        }
        dataCached.put(key, data);
    }
}
