<script>
  export let key;
  export let height;
  export let width;
  export let format = 'iframe';

  // Create the HTML string with inline scripts
  const adHTML = `
    <script type="text/javascript">
      atOptions = {
        'key': '${key}',
        'format': '${format}',
        'height': ${height},
        'width': ${width},
        'params': {}
      };
    <\/script>
    <script type="text/javascript" src="//www.highperformanceformat.com/${key}/invoke.js"><\/script>
  `;
</script>

<div class="ad-container">
  {@html adHTML}
</div>

<style>
  .ad-container {
    display: flex;
    justify-content: center;
    margin: 1rem 0;
  }
</style>
