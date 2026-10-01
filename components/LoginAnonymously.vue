<template>
  <div class="flex flex-col items-stretch gap-2">
    <Button @click="login" size="lg" wide>
      Continue as Guest
    </Button>
    <Alert v-if="errorMessage" color="negative">
      {{ errorMessage }}
    </Alert>
  </div>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient();
const router = useRouter();
const errorMessage = ref<string>();

async function login() {
  errorMessage.value = undefined;
  const { error } = await supabase.auth.signInAnonymously();

  if (error) {
    console.error(error);
    errorMessage.value = error.message;
  } else {
    router.push("/welcome");
  }
}
</script>
