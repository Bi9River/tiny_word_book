<script lang="ts">
	// 引入我们刚才写的 store
	import { settings } from '$lib/settings';

	// 局部变量，用来绑定输入框
	let token = $settings.token;
	let username = $settings.username;
	let repo = $settings.repo;
	
	let isSaved = false;

	// 保存动作
	function saveConfig() {
		// 给 store 赋值，它会自动触发 settings.ts 里的 subscribe 存入 localStorage
		$settings = { token, username, repo };
		isSaved = true;
		setTimeout(() => (isSaved = false), 2000); // 2秒后隐藏成功提示
	}

	// 清除动作
	function clearConfig() {
		token = '';
		username = '';
		repo = '';
		$settings = { token: '', username: '', repo: '' };
	}
</script>

<main style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: sans-serif;">
	<h1>⚙️ 单词本同步设置</h1>
	<p style="color: #666; font-size: 14px;">
		本项目为纯前端应用。你的 GitHub Token 仅会安全地保存在当前物理设备的浏览器缓存中，不会经过任何第三方服务器。
	</p>

	<div style="margin-bottom: 15px;">
		<label style="display: block; margin-bottom: 5px;">GitHub Username (你的用户名)</label>
		<input
			type="text"
			bind:value={username}
			placeholder="例如: Bi9River"
			style="width: 100%; padding: 8px; box-sizing: border-box;"
		/>
	</div>

	<div style="margin-bottom: 15px;">
		<label style="display: block; margin-bottom: 5px;">Private Repo (私有数据仓库名)</label>
		<input
			type="text"
			bind:value={repo}
			placeholder="例如: vocab_data"
			style="width: 100%; padding: 8px; box-sizing: border-box;"
		/>
	</div>

	<div style="margin-bottom: 15px;">
		<label style="display: block; margin-bottom: 5px;">Personal Access Token (PAT)</label>
		<input
			type="password"
			bind:value={token}
			placeholder="ghp_xxxxxxxxxxxxxxxxxxx"
			style="width: 100%; padding: 8px; box-sizing: border-box;"
		/>
	</div>

	<button on:click={saveConfig} style="padding: 10px 20px; cursor: pointer;">保存配置</button>
	<button on:click={clearConfig} style="padding: 10px 20px; cursor: pointer; color: red;">清除缓存</button>

	{#if isSaved}
		<span style="color: green; margin-left: 10px;">✅ 保存成功！</span>
	{/if}

	<hr style="margin: 30px 0;" />
	
	<h3>当前 Store 状态（调试用）：</h3>
	<pre style="background: #eee; padding: 10px; border-radius: 4px;">
{JSON.stringify($settings, null, 2)}
	</pre>
</main>
