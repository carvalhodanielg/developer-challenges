import type { MachineDto, MachineSortField } from '@dynapredict/shared-types';
import Add from '@mui/icons-material/Add';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import Edit from '@mui/icons-material/Edit';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Link,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { MachineFormDialog } from '../features/machines/MachineFormDialog';
import {
  deleteMachine,
  fetchMachines,
  pageChanged,
  pageSizeChanged,
  sortChanged,
} from '../features/machines/machinesSlice';
import type { ApiError } from '../services/apiClient';
import { formatDateTime, pluralize } from '../utils/format';

/** Spells out the cascade, so nobody erases readings by surprise. */
function DeleteMachineMessage({ machine }: { machine: MachineDto }) {
  const points = machine.monitoringPointsCount;
  return (
    <>
      <strong>{machine.name}</strong> will be permanently deleted
      {points === 0
        ? '. It has no monitoring points.'
        : `, together with its ${pluralize(points, 'monitoring point')}, their sensors and all of their readings.`}{' '}
      This can&apos;t be undone.
    </>
  );
}

type FormState = { open: false } | { open: true; machine: MachineDto | null };

export function MachinesListPage() {
  const dispatch = useAppDispatch();
  const { items, meta, query, status, error } = useAppSelector(
    (state) => state.machines,
  );
  const [form, setForm] = useState<FormState>({ open: false });
  const [toDelete, setToDelete] = useState<MachineDto | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // The slice changes `query` on page/size/sort; each change is a new fetch.
  useEffect(() => {
    void dispatch(fetchMachines());
  }, [dispatch, query]);

  const openDelete = (machine: MachineDto) => {
    setDeleteError(null);
    setToDelete(machine);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeletePending(true);
    setDeleteError(null);
    try {
      await dispatch(deleteMachine(toDelete.id)).unwrap();
      setNotice(`Machine "${toDelete.name}" deleted.`);
      setToDelete(null);
    } catch (rejected) {
      setDeleteError((rejected as ApiError).message);
    } finally {
      setDeletePending(false);
    }
  };

  const columns: DataTableColumn<MachineDto, MachineSortField>[] = [
    {
      id: 'name',
      header: 'Name',
      sortField: 'name',
      render: (machine) => (
        <Link component={RouterLink} to={`/machines/${machine.id}`}>
          {machine.name}
        </Link>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      sortField: 'type',
      render: (machine) => machine.type,
    },
    {
      id: 'points',
      header: 'Monitoring points',
      align: 'right',
      render: (machine) => machine.monitoringPointsCount,
    },
    {
      id: 'createdAt',
      header: 'Created',
      sortField: 'createdAt',
      render: (machine) => formatDateTime(machine.createdAt),
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'right',
      render: (machine) => (
        <Box sx={{ whiteSpace: 'nowrap' }}>
          <Tooltip title="Edit">
            <IconButton
              aria-label={`Edit ${machine.name}`}
              onClick={() => setForm({ open: true, machine })}
              sx={{ width: 44, height: 44 }}
            >
              <Edit />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              aria-label={`Delete ${machine.name}`}
              onClick={() => openDelete(machine)}
              sx={{ width: 44, height: 44 }}
            >
              <DeleteOutline />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
        }}
      >
        <Typography component="h1" variant="h4">
          Machines
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setForm({ open: true, machine: null })}
          sx={{ minHeight: 44 }}
        >
          New machine
        </Button>
      </Stack>

      <DataTable<MachineDto, MachineSortField>
        label="Machines"
        columns={columns}
        rows={items}
        getRowId={(machine) => machine.id}
        page={query.page}
        pageSize={query.pageSize}
        total={meta?.total ?? 0}
        pageSizeOptions={[5, 10, 25, 50]}
        onPageChange={(page) => dispatch(pageChanged(page))}
        onPageSizeChange={(size) => dispatch(pageSizeChanged(size))}
        sort={{ by: query.sortBy, dir: query.sortDir }}
        onSortChange={({ by, dir }) =>
          dispatch(sortChanged({ sortBy: by, sortDir: dir }))
        }
        loading={status === 'loading'}
        error={error?.message}
        onRetry={() => void dispatch(fetchMachines())}
        emptyMessage="No machines yet. Create the first one."
      />

      <MachineFormDialog
        open={form.open}
        machine={form.open ? form.machine : null}
        onClose={() => setForm({ open: false })}
        onSaved={(machine, action) => {
          setForm({ open: false });
          setNotice(`Machine "${machine.name}" ${action}.`);
        }}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete machine?"
        confirmLabel="Delete"
        pending={deletePending}
        error={deleteError}
        onClose={() => setToDelete(null)}
        onConfirm={() => void confirmDelete()}
        message={toDelete && <DeleteMachineMessage machine={toDelete} />}
      />

      <Snackbar
        open={notice !== null}
        autoHideDuration={4000}
        onClose={() => setNotice(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          variant="filled"
          role="status"
          onClose={() => setNotice(null)}
        >
          {notice}
        </Alert>
      </Snackbar>
    </Stack>
  );
}

export default MachinesListPage;
