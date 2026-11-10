'use client';

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  unwrap,
  type CreateDeadlineBody,
  type DeadlineDto,
  type DeadlineStatus,
  type GroupRole,
  type TaskDto,
  type TaskStatus,
} from './api/client';

export interface DeadlineFilters {
  from?: string;
  to?: string;
  groupId?: string;
  subjectId?: string;
  status?: DeadlineStatus;
}

export const keys = {
  deadlines: ['deadlines'] as const,
  deadlineList: (filters: DeadlineFilters) => ['deadlines', filters] as const,
  groups: ['groups'] as const,
  group: (id: string) => ['groups', id] as const,
  members: (id: string) => ['groups', id, 'members'] as const,
  subjects: (id: string) => ['groups', id, 'subjects'] as const,
  tasks: (id: string) => ['groups', id, 'tasks'] as const,
};

// ---- Queries ----

export function useDeadlines(filters: DeadlineFilters = {}) {
  return useQuery({
    queryKey: keys.deadlineList(filters),
    queryFn: () => unwrap(api.GET('/api/deadlines', { params: { query: filters } })),
  });
}

export function useGroups() {
  return useQuery({ queryKey: keys.groups, queryFn: () => unwrap(api.GET('/api/groups')) });
}

export function useGroup(groupId: string) {
  return useQuery({
    queryKey: keys.group(groupId),
    queryFn: () => unwrap(api.GET('/api/groups/{groupId}', { params: { path: { groupId } } })),
  });
}

export function useMembers(groupId: string) {
  return useQuery({
    queryKey: keys.members(groupId),
    queryFn: () =>
      unwrap(api.GET('/api/groups/{groupId}/members', { params: { path: { groupId } } })),
  });
}

export function useSubjects(groupId: string | null) {
  return useQuery({
    queryKey: keys.subjects(groupId ?? ''),
    enabled: Boolean(groupId),
    queryFn: () =>
      unwrap(
        api.GET('/api/groups/{groupId}/subjects', { params: { path: { groupId: groupId! } } }),
      ),
  });
}

/** Subjects of all my groups — for personal deadlines (US-11). */
export function useAllSubjects() {
  const groups = useGroups();
  const results = useQueries({
    queries: (groups.data ?? []).map((g) => ({
      queryKey: keys.subjects(g.id),
      queryFn: () =>
        unwrap(api.GET('/api/groups/{groupId}/subjects', { params: { path: { groupId: g.id } } })),
    })),
  });
  return results.flatMap((r) => r.data ?? []);
}

export function useTasks(groupId: string) {
  return useQuery({
    queryKey: keys.tasks(groupId),
    queryFn: () =>
      unwrap(api.GET('/api/groups/{groupId}/tasks', { params: { path: { groupId } } })),
  });
}

// ---- Deadlines ----

export function useToggleCompletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      done
        ? unwrap(api.PUT('/api/deadlines/{id}/completion', { params: { path: { id } } }))
        : unwrap(api.DELETE('/api/deadlines/{id}/completion', { params: { path: { id } } })),
    onMutate: async ({ id, done }) => {
      await queryClient.cancelQueries({ queryKey: keys.deadlines });
      queryClient.setQueriesData<DeadlineDto[]>({ queryKey: keys.deadlines }, (list) =>
        list?.map((d) =>
          d.id === id
            ? {
                ...d,
                status: done ? 'done' : new Date(d.dueAt) < new Date() ? 'overdue' : 'pending',
              }
            : d,
        ),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.deadlines }),
  });
}

export type DeadlineTarget = { kind: 'personal' } | { kind: 'group'; groupId: string };

export function useSaveDeadline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      target,
      body,
    }: {
      id?: string;
      target: DeadlineTarget;
      body: CreateDeadlineBody;
    }) => {
      if (id) return unwrap(api.PATCH('/api/deadlines/{id}', { params: { path: { id } }, body }));
      if (target.kind === 'group') {
        return unwrap(
          api.POST('/api/groups/{groupId}/deadlines', {
            params: { path: { groupId: target.groupId } },
            body,
          }),
        );
      }
      return unwrap(api.POST('/api/deadlines', { body }));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.deadlines }),
  });
}

export function useDeleteDeadline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(api.DELETE('/api/deadlines/{id}', { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.deadlines }),
  });
}

// ---- Groups ----

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => unwrap(api.POST('/api/groups', { body: { name } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.groups }),
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => unwrap(api.POST('/api/groups/join', { body: { code } })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.groups });
      void queryClient.invalidateQueries({ queryKey: keys.deadlines });
    },
  });
}

export function useRegenerateInviteCode(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      unwrap(api.POST('/api/groups/{groupId}/invite-code', { params: { path: { groupId } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.group(groupId) }),
  });
}

export function useChangeRole(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: GroupRole }) =>
      unwrap(
        api.PATCH('/api/groups/{groupId}/members/{userId}', {
          params: { path: { groupId, userId } },
          body: { role },
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.groups }),
  });
}

export function useRemoveMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      unwrap(
        api.DELETE('/api/groups/{groupId}/members/{userId}', {
          params: { path: { groupId, userId } },
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.groups });
      void queryClient.invalidateQueries({ queryKey: keys.deadlines });
    },
  });
}

// ---- Subjects ----

export interface SubjectBody {
  name: string;
  teacher?: string | null;
  color?: string;
}

export function useSaveSubject(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ subjectId, body }: { subjectId?: string; body: SubjectBody }) =>
      subjectId
        ? unwrap(
            api.PATCH('/api/groups/{groupId}/subjects/{subjectId}', {
              params: { path: { groupId, subjectId } },
              body,
            }),
          )
        : unwrap(
            api.POST('/api/groups/{groupId}/subjects', { params: { path: { groupId } }, body }),
          ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.subjects(groupId) });
      void queryClient.invalidateQueries({ queryKey: keys.deadlines });
    },
  });
}

export function useDeleteSubject(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subjectId: string) =>
      unwrap(
        api.DELETE('/api/groups/{groupId}/subjects/{subjectId}', {
          params: { path: { groupId, subjectId } },
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.subjects(groupId) });
      void queryClient.invalidateQueries({ queryKey: keys.deadlines });
    },
  });
}

// ---- Tasks ----

export interface TaskBody {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  position?: number;
  assigneeId?: string | null;
  deadlineId?: string | null;
}

export function useCreateTask(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TaskBody & { title: string }) =>
      unwrap(api.POST('/api/groups/{groupId}/tasks', { params: { path: { groupId } }, body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.tasks(groupId) }),
  });
}

export function useUpdateTask(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TaskBody }) =>
      unwrap(api.PATCH('/api/tasks/{id}', { params: { path: { id } }, body })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.tasks(groupId) }),
  });
}

export function useDeleteTask(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(api.DELETE('/api/tasks/{id}', { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.tasks(groupId) }),
  });
}

/** Local reorder used for optimistic drag-and-drop (mirrors the API rule K2). */
export function moveTaskLocally(
  tasks: TaskDto[],
  id: string,
  status: TaskStatus,
  index: number,
): TaskDto[] {
  const moving = tasks.find((t) => t.id === id);
  if (!moving) return tasks;
  const column = tasks
    .filter((t) => t.status === status && t.id !== id)
    .sort((a, b) => a.position - b.position);
  column.splice(Math.max(0, Math.min(index, column.length)), 0, { ...moving, status });
  const positions = new Map(column.map((t, i) => [t.id, i]));
  const others = tasks.filter((t) => t.status !== status && t.id !== id);
  return [...others, ...column.map((t) => ({ ...t, position: positions.get(t.id) ?? t.position }))];
}

// ---- Profile ----

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (fullName: string) => unwrap(api.PATCH('/api/users/me', { body: { fullName } })),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      unwrap(api.PATCH('/api/users/me/password', { body })),
  });
}
