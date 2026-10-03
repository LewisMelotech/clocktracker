<template>
  <CommunityTemplate>
    <template #default>
      <CommunityStatsPanel
        :stats="stats"
        :pending="pending"
        :error="error"
        :members="communityMembers"
        :is-member="isMember"
      />
    </template>
  </CommunityTemplate>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Status } from "~/composables/useFetchStatus";
import type {
  CommunityStats,
  CommunityStatsMember,
} from "~/components/CommunityStatsPanel.vue";

const route = useRoute();
const slug = route.params.slug as string;
const communities = useCommunities();
const user = useUser();
const metadata = await $fetch(`/api/community/${slug}/minimal`);

const { data: stats, pending, error } = useFetch<CommunityStats>(
  () => `/api/community/${slug}/stats`
);

const isMember = computed(() => communities.isMember(slug, user.value?.id));
const communityMembers = computed<CommunityStatsMember[]>(() => {
  const community = communities.getCommunity(slug);
  if (community.status !== Status.SUCCESS) return [];
  return community.data.members.map((member) => ({
    user_id: member.user_id,
    username: member.username,
    display_name: member.display_name,
    avatar: member.avatar ?? null,
  }));
});

useHead({
  title: () => `Stats - ${metadata.name}`,
});
</script>
