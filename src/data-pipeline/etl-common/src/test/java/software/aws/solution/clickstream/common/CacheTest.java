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

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CacheTest {
    private Cache<String> cache;

    @BeforeEach
    void setUp() {
        cache = new Cache<>(2);
    }

    @Test
    void shouldStoreDataWhenCacheIsNotFull() {
        cache.put("key1", "data1");
        assertTrue(cache.containsKey("key1"));
        assertEquals("data1", cache.get("key1"));
    }

    @Test
    void shouldOverwriteDataWhenKeyExists() {
        cache.put("key1", "data1");
        cache.put("key1", "data2");
        assertEquals("data2", cache.get("key1"));
    }

    @Test
    void latestPutKeyShouldExistWhenCacheIsFull() {
        Cache<String> cache = new Cache<>(2);
        cache.put("key1", "data1");
        cache.put("key2", "data2");
        cache.put("key3", "data3");
        assertTrue(cache.containsKey("key3"));
    }

    @Test
    void shouldReturnNullWhenKeyDoesNotExist() {
        assertNull(cache.get("nonexistentKey"));
    }
}