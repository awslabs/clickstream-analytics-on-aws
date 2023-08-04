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

import { applyChangeToDashboard } from '../../service/quicksight/quicksight-visual-utils';

describe('QuickSight visual management test', () => {

  beforeEach(() => {
  });

  const dashboardDef = `
  {
    "DataSetConfigurations": [],
    "Sheets": [
        {
            "SheetId": "f43cdc10-0f41-4ad1-bd42-deb0f6dbeb64",
            "Name": "",
            "FilterControls": [],
            "Visuals": [],
            "Layouts": [
                {
                    "Configuration": {
                        "GridLayout": {
                            "Elements": [],
                            "CanvasSizeOptions": {
                                "ScreenCanvasSizeOptions": {
                                    "ResizeOption": "FIXED",
                                    "OptimizedViewPortWidth": "1600px"
                                }
                            }
                        }
                    }
                }
            ],
            "ContentType": "INTERACTIVE"
        }
    ],
    "CalculatedFields": [],
    "ParameterDeclarations": [],
    "FilterGroups": [],
    "AnalysisDefaults": {
        "DefaultNewSheetConfiguration": {
            "InteractiveLayoutConfiguration": {
                "Grid": {
                    "CanvasSizeOptions": {
                        "ScreenCanvasSizeOptions": {
                            "ResizeOption": "FIXED",
                            "OptimizedViewPortWidth": "1600px"
                        }
                    }
                }
            },
            "SheetContentType": "INTERACTIVE"
        }
    }
  }
  `;

  const visualContent =
  {
    FunnelChartVisual: {
      VisualId: 'e6105df1-3bd6-4d4d-9a44-f34d00fafea0',
      Title: {
        Visibility: 'VISIBLE',
      },
      Subtitle: {
        Visibility: 'VISIBLE',
      },
      ChartConfiguration: {
        FieldWells: {
          FunnelChartAggregatedFieldWells: {
            Category: [
              {
                CategoricalDimensionField: {
                  FieldId: '',
                  Column: {
                    DataSetIdentifier: '',
                    ColumnName: '',
                  },
                },
              },
            ],
            Values: [
              {
                CategoricalMeasureField: {
                  FieldId: '',
                  Column: {
                    DataSetIdentifier: '',
                    ColumnName: '',
                  },
                  AggregationFunction: 'COUNT',
                },
              },
            ],
          },
        },
        SortConfiguration: {
          CategorySort: [
            {
              FieldSort: {
                FieldId: '',
                Direction: 'DESC',
              },
            },
            {
              FieldSort: {
                FieldId: '',
                Direction: 'DESC',
              },
            },
          ],
          CategoryItemsLimit: {
            OtherCategories: 'INCLUDE',
          },
        },
        Tooltip: {
          TooltipVisibility: 'VISIBLE',
          SelectedTooltipType: 'DETAILED',
          FieldBasedTooltip: {
            AggregationVisibility: 'HIDDEN',
            TooltipTitleType: 'PRIMARY_VALUE',
            TooltipFields: [
              {
                FieldTooltipItem: {
                  FieldId: '',
                  Visibility: 'VISIBLE',
                },
              },
              {
                FieldTooltipItem: {
                  FieldId: '',
                  Visibility: 'VISIBLE',
                },
              },
            ],
          },
        },
        DataLabelOptions: {
          Visibility: 'VISIBLE',
          CategoryLabelVisibility: 'VISIBLE',
          MeasureLabelVisibility: 'VISIBLE',
        },
      },
      Actions: [

      ],
      ColumnHierarchies: [

      ],
    },
  }
  ;

  test('add visual to dashboard', () => {

    const dashbaord = applyChangeToDashboard({
      action: 'ADD',
      visuals: [
        {
          name: 'funnel chart',
          sheetId: 'f43cdc10-0f41-4ad1-bd42-deb0f6dbeb64',
          visualContent: visualContent,
          dataSetConfiguration: {
            Placeholder: 'clickstream_funnel_chart_view',
            DataSetSchema: {
              ColumnSchemaList: [
                {
                  Name: 'event_name',
                  DataType: 'STRING',
                },
                {
                  Name: 'event_date',
                  DataType: 'DATETIME',
                },
                {
                  Name: 'event_cnt',
                  DataType: 'STRING',
                },
              ],
            },
            ColumnGroupSchemaList: [],
          },
          filterControl: {
            DateTimePicker: {
              FilterControlId: 'ec48601c-4fa5-4219-a31b-ceaedfd9ad80',
              Title: 'event_date between',
              SourceFilterId: 'e6105df1-3bd6-4d4d-9a44-f34d00fafea0',
              Type: 'DATE_RANGE',
            },
          },
          parameterDeclarations: [
            {
              DateTimeParameterDeclaration: {
                Name: 'dateStart',
                DefaultValues: {
                  StaticValues: [],
                  RollingDate: {
                    Expression: "truncDate('DD', now())",
                  },
                },
                TimeGranularity: 'DAY',
              },
            },
            {
              DateTimeParameterDeclaration: {
                Name: 'dateEnd',
                DefaultValues: {
                  StaticValues: [],
                  RollingDate: {
                    Expression: "addDateTime(-1, 'DD', truncDate('DD', now()))",
                  },
                },
                TimeGranularity: 'DAY',
              },
            },
          ],
          filterGroup: {
            FilterGroupId: 'a4366267-b733-473a-962f-73acc694c2f7',
            Filters: [
              {
                TimeRangeFilter: {
                  FilterId: 'f51fec2f-f759-4e62-a356-fd21a24b75c9',
                  Column: {
                    DataSetIdentifier: 'clickstream_funnel_chart_view',
                    ColumnName: 'event_date',
                  },
                  NullOption: 'NON_NULLS_ONLY',
                  TimeGranularity: 'MINUTE',
                },
              },
            ],
            ScopeConfiguration: {
              SelectedSheets: {
                SheetVisualScopingConfigurations: [
                  {
                    SheetId: 'f43cdc10-0f41-4ad1-bd42-deb0f6dbeb64',
                    Scope: 'SELECTED_VISUALS',
                    VisualIds: [
                      'f43cdc10-0f41-4ad1-bd42-deb0f6dbeb64',
                    ],
                  },
                ],
              },
            },
            Status: 'ENABLED',
            CrossDataset: 'SINGLE_DATASET',
          },
          eventCount: 5,
        },
      ],
      dashboardDef: dashboardDef,

    });

    expect(JSON.stringify(dashbaord)).toEqual(JSON.stringify({
      DataSetConfigurations: [
        {
          Placeholder: 'clickstream_funnel_chart_view',
          DataSetSchema: {
            ColumnSchemaList: [
              {
                Name: 'event_name',
                DataType: 'STRING',
              },
              {
                Name: 'event_date',
                DataType: 'DATETIME',
              },
              {
                Name: 'event_cnt',
                DataType: 'STRING',
              },
            ],
          },
          ColumnGroupSchemaList: [

          ],
        },
      ],
      Sheets: [
        {
          SheetId: 'f43cdc10-0f41-4ad1-bd42-deb0f6dbeb64',
          Name: '',
          FilterControls: [
            {
              DateTimePicker: {
                FilterControlId: 'ec48601c-4fa5-4219-a31b-ceaedfd9ad80',
                Title: 'event_date between',
                SourceFilterId: 'e6105df1-3bd6-4d4d-9a44-f34d00fafea0',
                Type: 'DATE_RANGE',
              },
            },
          ],
          Visuals: [
            {
              FunnelChartVisual: {
                VisualId: 'e6105df1-3bd6-4d4d-9a44-f34d00fafea0',
                Title: {
                  Visibility: 'VISIBLE',
                },
                Subtitle: {
                  Visibility: 'VISIBLE',
                },
                ChartConfiguration: {
                  FieldWells: {
                    FunnelChartAggregatedFieldWells: {
                      Category: [
                        {
                          CategoricalDimensionField: {
                            FieldId: '',
                            Column: {
                              DataSetIdentifier: '',
                              ColumnName: '',
                            },
                          },
                        },
                      ],
                      Values: [
                        {
                          CategoricalMeasureField: {
                            FieldId: '',
                            Column: {
                              DataSetIdentifier: '',
                              ColumnName: '',
                            },
                            AggregationFunction: 'COUNT',
                          },
                        },
                      ],
                    },
                  },
                  SortConfiguration: {
                    CategorySort: [
                      {
                        FieldSort: {
                          FieldId: '',
                          Direction: 'DESC',
                        },
                      },
                      {
                        FieldSort: {
                          FieldId: '',
                          Direction: 'DESC',
                        },
                      },
                    ],
                    CategoryItemsLimit: {
                      OtherCategories: 'INCLUDE',
                    },
                  },
                  Tooltip: {
                    TooltipVisibility: 'VISIBLE',
                    SelectedTooltipType: 'DETAILED',
                    FieldBasedTooltip: {
                      AggregationVisibility: 'HIDDEN',
                      TooltipTitleType: 'PRIMARY_VALUE',
                      TooltipFields: [
                        {
                          FieldTooltipItem: {
                            FieldId: '',
                            Visibility: 'VISIBLE',
                          },
                        },
                        {
                          FieldTooltipItem: {
                            FieldId: '',
                            Visibility: 'VISIBLE',
                          },
                        },
                      ],
                    },
                  },
                  DataLabelOptions: {
                    Visibility: 'VISIBLE',
                    CategoryLabelVisibility: 'VISIBLE',
                    MeasureLabelVisibility: 'VISIBLE',
                  },
                },
                Actions: [

                ],
                ColumnHierarchies: [

                ],
              },
            },
          ],
          Layouts: [
            {
              Configuration: {
                GridLayout: {
                  Elements: [
                    {
                      ElementId: 'ec48601c-4fa5-4219-a31b-ceaedfd9ad80',
                      ElementType: 'FILTER_CONTROL',
                      ColumnIndex: 1,
                      ColumnSpan: 8,
                      RowIndex: 0,
                      RowSpan: 2,
                    },
                    {
                      ElementId: 'e6105df1-3bd6-4d4d-9a44-f34d00fafea0',
                      ElementType: 'VISUAL',
                      ColumnIndex: 1,
                      ColumnSpan: 20,
                      RowIndex: 2,
                      RowSpan: 10,
                    },
                  ],
                  CanvasSizeOptions: {
                    ScreenCanvasSizeOptions: {
                      ResizeOption: 'FIXED',
                      OptimizedViewPortWidth: '1600px',
                    },
                  },
                },
              },
            },
          ],
          ContentType: 'INTERACTIVE',
        },
      ],
      CalculatedFields: [

      ],
      ParameterDeclarations: [
        [
          {
            DateTimeParameterDeclaration: {
              Name: 'dateStart',
              DefaultValues: {
                StaticValues: [

                ],
                RollingDate: {
                  Expression: "truncDate('DD', now())",
                },
              },
              TimeGranularity: 'DAY',
            },
          },
          {
            DateTimeParameterDeclaration: {
              Name: 'dateEnd',
              DefaultValues: {
                StaticValues: [

                ],
                RollingDate: {
                  Expression: "addDateTime(-1, 'DD', truncDate('DD', now()))",
                },
              },
              TimeGranularity: 'DAY',
            },
          },
        ],
      ],
      FilterGroups: [
        {
          FilterGroupId: 'a4366267-b733-473a-962f-73acc694c2f7',
          Filters: [
            {
              TimeRangeFilter: {
                FilterId: 'f51fec2f-f759-4e62-a356-fd21a24b75c9',
                Column: {
                  DataSetIdentifier: 'clickstream_funnel_chart_view',
                  ColumnName: 'event_date',
                },
                NullOption: 'NON_NULLS_ONLY',
                TimeGranularity: 'MINUTE',
              },
            },
          ],
          ScopeConfiguration: {
            SelectedSheets: {
              SheetVisualScopingConfigurations: [
                {
                  SheetId: 'f43cdc10-0f41-4ad1-bd42-deb0f6dbeb64',
                  Scope: 'SELECTED_VISUALS',
                  VisualIds: [
                    'f43cdc10-0f41-4ad1-bd42-deb0f6dbeb64',
                  ],
                },
              ],
            },
          },
          Status: 'ENABLED',
          CrossDataset: 'SINGLE_DATASET',
        },
      ],
      AnalysisDefaults: {
        DefaultNewSheetConfiguration: {
          InteractiveLayoutConfiguration: {
            Grid: {
              CanvasSizeOptions: {
                ScreenCanvasSizeOptions: {
                  ResizeOption: 'FIXED',
                  OptimizedViewPortWidth: '1600px',
                },
              },
            },
          },
          SheetContentType: 'INTERACTIVE',
        },
      },
    }));

  });

});
