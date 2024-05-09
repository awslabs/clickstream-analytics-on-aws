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
import java.util.Map;

import java.util.LinkedHashMap;

public class Cache<T> {
    private final Map<String, T> dataCached;

    public Cache() {
        this(Integer.MAX_VALUE);
    }
    public Cache(final int size) {
        this.dataCached = new LinkedHashMap<>(10_000, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(final Map.Entry<String, T> eldest) {
                return size() >  size;
            }
        };
    }
    public boolean containsKey(final String key) {
        return dataCached.containsKey(key);
    }
    public T get(final String key) {
        return dataCached.get(key);
    }

    public void put(final String key, final T data) {
        dataCached.put(key, data);
    }
}
