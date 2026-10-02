<template>
  <FriendsTemplate v-slot="{ friends }" fetchFriends>
    <div class="flex flex-col gap-3 justify-center">
      <UserCard
        v-for="friend in friends"
        :username="friend.username"
        class="w-full"
      >
        <FriendButton
          v-if="!singleCommunity"
          :username="friend.username"
          :user_id="friend.user_id"
        />
      </UserCard>
    </div>
  </FriendsTemplate>
</template>

<script setup lang="ts">
const singleCommunity = useRuntimeConfig().public.singleCommunity;
</script>
