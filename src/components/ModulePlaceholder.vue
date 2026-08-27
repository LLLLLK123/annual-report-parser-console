<script setup>
defineProps({
  title: { type: String, required: true },
})

const emit = defineEmits(['go-home'])
</script>

<template>
  <main class="module-main">
    <section class="module-hero">
      <span class="hero-label">MODULE WORKSPACE</span>
      <h1>{{ title }}</h1>
      <p>
        这里是 {{ title }} 的正式工作页面入口。
        现在先完成登录跳转链路，后面我们可以继续把这个模块的真实页面内容铺进去。
      </p>
      <div class="module-actions">
        <button class="ghost-btn" type="button" @click="emit('go-home')">返回首页</button>
      </div>
    </section>
  </main>
</template>
