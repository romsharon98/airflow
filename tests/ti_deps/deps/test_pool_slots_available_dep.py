#
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
from __future__ import annotations

from unittest.mock import Mock, patch

import pytest

from airflow.models import Pool
from airflow.ti_deps.dependencies_states import EXECUTION_STATES
from airflow.ti_deps.deps.pool_slots_available_dep import PoolSlotsAvailableDep
from airflow.utils.session import create_session
from airflow.utils.state import TaskInstanceState

from tests_common.test_utils import db

pytestmark = pytest.mark.db_test


class TestPoolSlotsAvailableDep:
    def setup_method(self):
        db.clear_db_pools()
        with create_session() as session:
            test_pool = Pool(pool="test_pool", include_deferred=False)
            test_includes_deferred_pool = Pool(pool="test_includes_deferred_pool", include_deferred=True)
            session.add_all([test_pool, test_includes_deferred_pool])
            session.commit()

    def teardown_method(self):
        db.clear_db_pools()

    @patch("airflow.models.Pool.open_slots", return_value=0)
    def test_pooled_task_reached_concurrency(self, mock_open_slots):
        ti = Mock(pool="test_pool", pool_slots=1)
        assert not PoolSlotsAvailableDep().is_met(ti=ti)

    @patch("airflow.models.Pool.open_slots", return_value=1)
    def test_pooled_task_pass(self, mock_open_slots):
        ti = Mock(pool="test_pool", pool_slots=1)
        assert PoolSlotsAvailableDep().is_met(ti=ti)

    @patch("airflow.models.Pool.open_slots", return_value=0)
    def test_running_pooled_task_pass(self, mock_open_slots):
        for state in EXECUTION_STATES:
            ti = Mock(pool="test_pool", state=state, pool_slots=1)
            assert PoolSlotsAvailableDep().is_met(ti=ti)

    @patch("airflow.models.Pool.open_slots", return_value=0)
    def test_deferred_pooled_task_pass(self, mock_open_slots):
        ti = Mock(pool="test_includes_deferred_pool", state=TaskInstanceState.DEFERRED, pool_slots=1)
        assert PoolSlotsAvailableDep().is_met(ti=ti)
        ti_to_fail = Mock(pool="test_pool", state=TaskInstanceState.DEFERRED, pool_slots=1)
        assert not PoolSlotsAvailableDep().is_met(ti=ti_to_fail)

    def test_task_with_nonexistent_pool(self):
        ti = Mock(pool="nonexistent_pool", pool_slots=1)
        assert not PoolSlotsAvailableDep().is_met(ti=ti)
