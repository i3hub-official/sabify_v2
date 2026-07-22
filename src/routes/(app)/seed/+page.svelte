<!-- src/routes/(admin)/admin/seed/+page.svelte (DEVELOPMENT ONLY) -->
<!-- ─────────────────────────────────────────────────────────────────────────────
     Web UI for seeding database in development mode.
     ⚠️  This route should only be accessible in NODE_ENV=development
     ────────────────────────────────────────────────────────────────────────────── -->

<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData, PageData } from './$types';

  const { data, form } = $props() as { data: PageData; form: ActionData };

  let loading = $state(false);
  let message = $state('');
  let resetConfirm = $state('');

  function onSubmit(e: SubmitEvent) {
    loading = true;
    message = '';
  }

  function onComplete() {
    loading = false;
  }

  function resetDatabasePrompt() {
    const confirmed = prompt(
      '⚠️  WARNING: This will DELETE ALL DATA in the database.\n\nType "YES_DELETE_ALL_DATA" to confirm:'
    );
    if (confirmed === 'YES_DELETE_ALL_DATA') {
      resetConfirm = confirmed;
      const form = document.getElementById('resetForm') as HTMLFormElement;
      if (form) form.submit();
    }
  }
</script>

<svelte:head>
  <title>Database Seeding</title>
</svelte:head>

<div class="page">
  <div class="container">
    {#if form?.error}
      <div class="alert alert-error">
        <h3>Error</h3>
        <p>{form.error}</p>
      </div>
    {/if}

    {#if form?.success}
      <div class="alert alert-success">
        <h3>Success!</h3>
        {#if form.message}
          <p>{form.message}</p>
        {/if}
        {#if form.summary}
          <ul>
            <li>Universities: {form.summary.universities}</li>
            <li>Colleges & Departments: {form.summary.collegesDepts}</li>
            <li>Courses: {form.summary.courses}</li>
            <li>Admins: {form.summary.admins}</li>
          </ul>
        {/if}
      </div>
    {/if}

    <!-- Database Stats -->
    <section class="stats">
      <h2>Database Status</h2>
      <div class="grid">
        <div class="stat">
          <div class="count">{data.stats.universities}</div>
          <div class="label">Universities</div>
        </div>
        <div class="stat">
          <div class="count">{data.stats.colleges}</div>
          <div class="label">Colleges</div>
        </div>
        <div class="stat">
          <div class="count">{data.stats.departments}</div>
          <div class="label">Departments</div>
        </div>
        <div class="stat">
          <div class="count">{data.stats.courses}</div>
          <div class="label">Courses</div>
        </div>
        <div class="stat">
          <div class="count">{data.stats.users}</div>
          <div class="label">Users</div>
        </div>
        <div class="stat">
          <div class="count">{data.stats.admins}</div>
          <div class="label">Admins</div>
        </div>
      </div>
    </section>

    <!-- Seeding Options -->
    <section class="seeding">
      <h2>Seed Data</h2>
      <p class="info">
        Choose what to seed. Run in order: Universities → Colleges/Departments → Courses → Admins
      </p>

      <div class="actions">
        <!-- Seed All -->
        <form method="POST" action="?/seedAll" use:enhance on:submit={onSubmit} on:change={onComplete}>
          <button type="submit" disabled={loading} class="btn btn-primary btn-lg">
            {#if loading}
              🔄 Seeding...
            {:else}
              ⚡ Seed Everything
            {/if}
          </button>
          <p class="help-text">Seed all data in order (recommended for new database)</p>
        </form>

        <!-- Seed Individual Steps -->
        <div class="grid-2">
          <form method="POST" action="?/seedUniversities" use:enhance on:submit={onSubmit} on:change={onComplete}>
            <button type="submit" disabled={loading} class="btn btn-secondary">
              {#if loading}
                🔄 Loading...
              {:else}
                🏛️ Seed Universities
              {/if}
            </button>
            <p class="help-text">Create all universities</p>
          </form>

          <form method="POST" action="?/seedCollegesAndDepts" use:enhance on:submit={onSubmit} on:change={onComplete}>
            <button type="submit" disabled={loading} class="btn btn-secondary">
              {#if loading}
                🔄 Loading...
              {:else}
                🎓 Seed Colleges & Depts
              {/if}
            </button>
            <p class="help-text">Create colleges and departments</p>
          </form>

          <form method="POST" action="?/seedCourses" use:enhance on:submit={onSubmit} on:change={onComplete}>
            <button type="submit" disabled={loading} class="btn btn-secondary">
              {#if loading}
                🔄 Loading...
              {:else}
                📚 Seed Courses
              {/if}
            </button>
            <p class="help-text">Create sample courses</p>
          </form>

          <form method="POST" action="?/seedAdmins" use:enhance on:submit={onSubmit} on:change={onComplete}>
            <button type="submit" disabled={loading} class="btn btn-secondary">
              {#if loading}
                🔄 Loading...
              {:else}
                👑 Seed Admins
              {/if}
            </button>
            <p class="help-text">Create admin users</p>
          </form>
        </div>
      </div>
    </section>

    <!-- Danger Zone -->
    <section class="danger-zone">
      <h2>⚠️ Danger Zone</h2>
      <div class="warning">
        <p><strong>Reset Database:</strong> Permanently delete ALL data. This cannot be undone.</p>
        <button type="button" class="btn btn-danger" on:click={resetDatabasePrompt}>
          🗑️ Reset Database
        </button>
      </div>
    </section>

    <!-- Admin Credentials -->
    <section class="credentials">
      <h2>Default Admin Credentials</h2>
      <div class="table">
        <div class="row header">
          <div class="col">Role</div>
          <div class="col">Email</div>
          <div class="col">Password</div>
          <div class="col">Scope</div>
        </div>

        <div class="row">
          <div class="col"><code>SUPER_ADMIN</code></div>
          <div class="col"><code>super.admin@sabify.com</code></div>
          <div class="col"><code>SuperPass123!</code></div>
          <div class="col">Platform-wide</div>
        </div>

        <div class="row">
          <div class="col"><code>UNIVERSITY_ADMIN</code></div>
          <div class="col"><code>vc.mouau@sabify.com</code></div>
          <div class="col"><code>VCPass123!</code></div>
          <div class="col">MOUAU</div>
        </div>

        <div class="row">
          <div class="col"><code>COLLEGE_ADMIN</code></div>
          <div class="col"><code>dean.science@mouau.com</code></div>
          <div class="col"><code>DeanPass123!</code></div>
          <div class="col">Faculty of Science</div>
        </div>
      </div>
      <p class="help-text">⚠️ Change these passwords immediately in production!</p>
    </section>

    <!-- Reset Form (hidden) -->
    <form id="resetForm" method="POST" action="?/reset" style="display: none">
      <input type="hidden" name="confirm" value={resetConfirm} />
    </form>
  </div>
</div>

<style>
  .page {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    padding: 2rem;
  }

  .container {
    max-width: 1000px;
    margin: 0 auto;
    background: white;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  section {
    margin-bottom: 3rem;
  }

  h2 {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
    color: #333;
    border-bottom: 2px solid #667eea;
    padding-bottom: 0.75rem;
  }

  .alert {
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 2rem;
  }

  .alert h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
  }

  .alert p {
    margin: 0.25rem 0;
  }

  .alert-error {
    background: #fee;
    border-left: 4px solid #c33;
    color: #933;
  }

  .alert-success {
    background: #efe;
    border-left: 4px solid #3c3;
    color: #393;
  }

  .stats {
    background: #f8f9fa;
    padding: 1.5rem;
    border-radius: 8px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  .stat {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .stat .count {
    font-size: 2.5rem;
    font-weight: bold;
    color: #667eea;
  }

  .stat .label {
    font-size: 0.875rem;
    color: #666;
    margin-top: 0.5rem;
  }

  .info {
    background: #f0f4ff;
    padding: 1rem;
    border-radius: 8px;
    color: #333;
    margin-bottom: 1.5rem;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .grid-2 {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  .grid-2 form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .btn-secondary {
    background: #e8eef7;
    color: #667eea;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #dce4f0;
  }

  .btn-danger {
    background: #dc3545;
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background: #c82333;
  }

  .btn-lg {
    padding: 1rem 2rem;
    font-size: 1.1rem;
  }

  .help-text {
    font-size: 0.875rem;
    color: #666;
    margin: 0;
  }

  .danger-zone {
    background: #fff5f5;
    border-left: 4px solid #dc3545;
    padding: 1.5rem;
    border-radius: 8px;
  }

  .warning {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    border: 2px dashed #dc3545;
  }

  .warning p {
    margin: 0 0 1rem 0;
    color: #333;
  }

  .table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .row {
    display: grid;
    grid-template-columns: 150px 1fr 150px 150px;
    gap: 0;
    border-bottom: 1px solid #e8e8e8;
  }

  .row.header {
    background: #f8f9fa;
    font-weight: 600;
    color: #333;
  }

  .col {
    padding: 1rem;
    font-size: 0.875rem;
  }

  code {
    background: #f5f5f5;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.85em;
  }

  @media (max-width: 768px) {
    .container {
      padding: 1rem;
    }

    .row {
      grid-template-columns: 1fr;
    }

    .col {
      border-bottom: 1px solid #e8e8e8;
      padding: 0.75rem;
    }

    .row.header .col {
      font-weight: 600;
      background: #f8f9fa;
    }
  }
</style>