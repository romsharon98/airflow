/*!
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import {
  Box,
  createListCollection,
  Field,
  HStack,
  type SelectValueChangeDetails,
} from "@chakra-ui/react";
import { Select as ReactSelect } from "chakra-react-select";
import type { MultiValue } from "chakra-react-select";
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { useDagServiceGetDagTags } from "openapi/queries";
import { useTableURLState } from "src/components/DataTable/useTableUrlState";
import { QuickFilterButton } from "src/components/QuickFilterButton";
import { Select } from "src/components/ui";
import {
  SearchParamsKeys,
  type SearchParamsKeysType,
} from "src/constants/searchParams";

const {
  LAST_DAG_RUN_STATE: LAST_DAG_RUN_STATE_PARAM,
  PAUSED: PAUSED_PARAM,
  TAGS: TAGS_PARAM,
}: SearchParamsKeysType = SearchParamsKeys;

const enabledOptions = createListCollection({
  items: [
    { label: "All", value: "All" },
    { label: "Enabled", value: "false" },
    { label: "Disabled", value: "true" },
  ],
});

export const DagsFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const showPaused = searchParams.get(PAUSED_PARAM);
  const state = searchParams.get(LAST_DAG_RUN_STATE_PARAM);
  const selectedTags = searchParams.getAll(TAGS_PARAM);
  const isAll = state === null;
  const isRunning = state === "running";
  const isFailed = state === "failed";
  const isSuccess = state === "success";

  const { data } = useDagServiceGetDagTags({
    orderBy: "name",
  });

  const { setTableURLState, tableURLState } = useTableURLState();
  const { pagination, sorting } = tableURLState;

  const handlePausedChange = useCallback(
    ({ value }: SelectValueChangeDetails<string>) => {
      const [val] = value;

      if (val === "All" || val === undefined) {
        searchParams.delete(PAUSED_PARAM);
      } else {
        searchParams.set(PAUSED_PARAM, val);
      }
      setSearchParams(searchParams);
      setTableURLState({
        pagination: { ...pagination, pageIndex: 0 },
        sorting,
      });
    },
    [pagination, searchParams, setSearchParams, setTableURLState, sorting],
  );

  const handleStateChange: React.MouseEventHandler<HTMLButtonElement> =
    useCallback(
      ({ currentTarget: { value } }) => {
        if (value === "all") {
          searchParams.delete(LAST_DAG_RUN_STATE_PARAM);
        } else {
          searchParams.set(LAST_DAG_RUN_STATE_PARAM, value);
        }
        setSearchParams(searchParams);
        setTableURLState({
          pagination: { ...pagination, pageIndex: 0 },
          sorting,
        });
      },
      [pagination, searchParams, setSearchParams, setTableURLState, sorting],
    );
  const handleSelectTagsChange = useCallback(
    (
      tags: MultiValue<{
        label: string;
        value: string;
      }>,
    ) => {
      searchParams.delete(TAGS_PARAM);
      tags.forEach(({ value }) => {
        searchParams.append(TAGS_PARAM, value);
      });
      setSearchParams(searchParams);
    },
    [searchParams, setSearchParams],
  );

  return (
    <HStack justifyContent="space-between">
      <HStack gap={4}>
        <HStack>
          <QuickFilterButton
            active={isAll}
            onClick={handleStateChange}
            value="all"
          >
            All
          </QuickFilterButton>
          <QuickFilterButton
            active={isFailed}
            onClick={handleStateChange}
            value="failed"
          >
            Failed
          </QuickFilterButton>
          <QuickFilterButton
            active={isRunning}
            onClick={handleStateChange}
            value="running"
          >
            Running
          </QuickFilterButton>
          <QuickFilterButton
            active={isSuccess}
            onClick={handleStateChange}
            value="success"
          >
            Success
          </QuickFilterButton>
        </HStack>
        <Select.Root
          collection={enabledOptions}
          onValueChange={handlePausedChange}
          value={showPaused === null ? ["All"] : [showPaused]}
        >
          <Select.Trigger>
            <Select.ValueText width={20} />
          </Select.Trigger>
          <Select.Content>
            {enabledOptions.items.map((option) => (
              <Select.Item item={option} key={option.label}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </HStack>
      <Box>
        <Field.Root>
          <ReactSelect
            aria-label="Filter Dags by tag"
            chakraStyles={{
              container: (provided) => ({
                ...provided,
                minWidth: 64,
              }),
              menu: (provided) => ({
                ...provided,
                zIndex: 2,
              }),
            }}
            isClearable
            isMulti
            noOptionsMessage={() => "No tags found"}
            onChange={handleSelectTagsChange}
            options={data?.tags.map((tag) => ({
              label: tag,
              value: tag,
            }))}
            placeholder="Filter by tag"
            value={selectedTags.map((tag) => ({
              label: tag,
              value: tag,
            }))}
          />
        </Field.Root>
      </Box>
    </HStack>
  );
};