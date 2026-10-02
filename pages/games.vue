<template>
  <StandardTemplate>
    <p
      v-if="games.getAll.status === Status.ERROR"
      class="text-center py-8"
    >
      Couldn't load games. Try refreshing the page.
    </p>
    <UserGamesView
      v-else
      :games="games.getAll"
      :player="null"
      :showCommunityCard="true"
    />
  </StandardTemplate>
</template>

<script setup lang="ts">
import { Status } from "~/composables/useFetchStatus";

definePageMeta({
  middleware: [
    () => {
      if (!useRuntimeConfig().public.allGamesBrowsing) {
        return navigateTo("/");
      }
    },
  ],
});

const games = useGames();

onMounted(() => {
  games.fetchAllGames();
});

useHead({
  title: "All Games",
});
</script>
