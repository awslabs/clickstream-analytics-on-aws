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

import useFetchParams, { EventDataType } from 'hooks/useFetchEvents';
import React, { ReactElement, createContext, useContext } from 'react';

interface EventsContextType {
  data: EventDataType;
  loading: boolean;
  error: Error | null;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export const EventsParameterProvider: React.FC<{ children: ReactElement }> = ({
  children,
}) => {
  const { data, loading, error } = useFetchParams();

  return (
    <EventsContext.Provider value={{ data, loading, error }}>
      {children}
    </EventsContext.Provider>
  );
};

export const useUserEventParameter = () => {
  const context = useContext(EventsContext);
  if (context === undefined) {
    throw new Error(
      'useUserEventParameter must be used within a EventsParameterProvider'
    );
  }
  return context;
};
