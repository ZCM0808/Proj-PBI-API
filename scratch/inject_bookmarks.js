
const newBookmarks = [
  {
    "operationId": "Datasets_UpdateDataset",
    "method": "PATCH",
    "path": "/v1.0/myorg/datasets/{datasetId}",
    "summary": "Updates the properties for the specified dataset from **My workspace**.",
    "tags": [
      "Datasets"
    ],
    "category": "official",
    "description": "\n## Permissions\n\nThe user must be the dataset owner.\n\n## Required Scope\n\nDataset.ReadWrite.All\n<br><br>"
  },
  {
    "operationId": "Datasets_RefreshDataset",
    "method": "POST",
    "path": "/v1.0/myorg/datasets/{datasetId}/refreshes",
    "summary": "Triggers a refresh for the specified dataset from **My workspace**. An [enhanced refresh](/power-bi/connect-data/asynchronous-refresh) is triggered only if a request payload other than `notifyOption` is set.",
    "tags": [
      "Datasets"
    ],
    "category": "official",
    "description": "\n## Required Scope\n\nDataset.ReadWrite.All\n\n## Limitations\n\n- For Shared capacities, a maximum of eight requests per day, including refreshes executed by using scheduled refresh, can be initiated.\n- For Shared capacities, only `notifyOption` can be specified in the request body.\n- Enhanced refresh is not supported for shared capacities.\n- For enhanced refresh, `notifyOption` is not required and must be excluded from the request body. However, one or more parameters other than `notifyOption` are required.\n- For Premium capacities, the maximum requests per day is only limited by the available resources in the capacity. If available resources are overloaded, refreshes are throttled until the load is reduced. The refresh will fail if throttling exceeds 1 hour.\n<br><br>"
  },
  {
    "operationId": "Datasets_UpdateParameters",
    "method": "POST",
    "path": "/v1.0/myorg/datasets/{datasetId}/Default.UpdateParameters",
    "summary": "Updates the parameters values for the specified dataset from **My workspace**.",
    "tags": [
      "Datasets"
    ],
    "category": "official",
    "description": "\n> [!NOTE]\n> We recommend using [enhanced dataset metadata](/power-bi/connect-data/desktop-enhanced-dataset-metadata) with this API call.\n\n> [!IMPORTANT]\n>\n> - If you're using **enhanced dataset metadata**, refresh the dataset to apply the new parameter values.\n> - If you're not using **enhanced dataset metadata**, wait 30 minutes for the update data sources operation to complete, and then refresh the dataset.\n\n## Permissions\n\nThe user must be the dataset owner.\n\n## Required Scope\n\nDataset.ReadWrite.All\n\n## Limitations\n\n- Datasets created or modified using the public [XMLA endpoint](/power-bi/admin/service-premium-connect-tools) aren't supported. To make changes to those datasets, the admin must use the Azure Analysis Services client library for Tabular Object Model.\n- [DirectQuery](/power-bi/connect-data/desktop-directquery-about) connections are only supported with [enhanced dataset metadata](/power-bi/connect-data/desktop-enhanced-dataset-metadata).\n- Datasets with Azure Analysis Services live connections aren't supported.\n- Maximum of 100 parameters per request.\n- All specified parameters must exist in the dataset.\n- Parameters values should be of the expected type.\n- The parameter list can't be empty or include duplicate parameters.\n- Parameters names are case-sensitive.\n- Parameter `IsRequired` must have a non-empty value.\n- The parameter types `Any` and `Binary` can't be updated.\n<br><br>"
  },
  {
    "operationId": "Datasets_UpdateDatasetInGroup",
    "method": "PATCH",
    "path": "/v1.0/myorg/groups/{groupId}/datasets/{datasetId}",
    "summary": "Updates the properties for the specified dataset from the specified workspace.",
    "tags": [
      "Datasets"
    ],
    "category": "official",
    "description": "\n## Permissions\n\nThe user must be the dataset owner.\n\n## Required Scope\n\nDataset.ReadWrite.All\n<br><br>"
  },
  {
    "operationId": "Datasets_RefreshDatasetInGroup",
    "method": "POST",
    "path": "/v1.0/myorg/groups/{groupId}/datasets/{datasetId}/refreshes",
    "summary": "Triggers a refresh for the specified dataset from the specified workspace. An [enhanced refresh](/power-bi/connect-data/asynchronous-refresh) is triggered only if a request payload other than `notifyOption` is set.",
    "tags": [
      "Datasets"
    ],
    "category": "official",
    "description": "\n## Permissions\n\nThis API call can be called by a service principal profile. For more information see: [Service principal profiles in Power BI Embedded](/power-bi/developer/embedded/embed-multi-tenancy).\n\n## Required Scope\n\nDataset.ReadWrite.All\n\n## Limitations\n\n- For Shared capacities, a maximum of eight requests per day, including refreshes executed by using scheduled refresh, can be initiated.\n- For Shared capacities, only `notifyOption` can be specified in the request body.\n- Enhanced refresh is not supported for shared capacities.\n- For enhanced refresh, `notifyOption` is not required and must be excluded from the request body. However, one or more parameters other than `notifyOption` are required.\n- For Premium capacities, the maximum requests per day is only limited by the available resources in the capacity. If available resources are overloaded, refreshes are throttled until the load is reduced. The refresh will fail if throttling exceeds 1 hour.\n<br><br>"
  },
  {
    "operationId": "Datasets_UpdateParametersInGroup",
    "method": "POST",
    "path": "/v1.0/myorg/groups/{groupId}/datasets/{datasetId}/Default.UpdateParameters",
    "summary": "Updates the parameters values for the specified dataset from the specified workspace.",
    "tags": [
      "Datasets"
    ],
    "category": "official",
    "description": "\n> [!NOTE]\n> We recommend using [enhanced dataset metadata](/power-bi/connect-data/desktop-enhanced-dataset-metadata) with this API call.\n\n> [!IMPORTANT]\n>\n> - If you're using **enhanced dataset metadata**, refresh the dataset to apply the new parameter values.\n> - If you're not using **enhanced dataset metadata**, wait 30 minutes for the update data sources operation to complete, and then refresh the dataset.\n\n## Permissions\n\n- The user must be the dataset owner.\n- This API call can be called by a service principal profile. For more information see: [Service principal profiles in Power BI Embedded](/power-bi/developer/embedded/embed-multi-tenancy).\n\n## Required Scope\n\nDataset.ReadWrite.All\n\n## Limitations\n\n- Datasets created or modified using the public [XMLA endpoint](/power-bi/admin/service-premium-connect-tools) aren't supported. To make changes to those datasets, the admin must use the Azure Analysis Services client library for Tabular Object Model.\n- [DirectQuery](/power-bi/connect-data/desktop-directquery-about) connections are only supported with [enhanced dataset metadata](/power-bi/connect-data/desktop-enhanced-dataset-metadata).\n- Datasets with Azure Analysis Services live connections aren't supported.\n- Maximum of 100 parameters per request.\n- All specified parameters must exist in the dataset.\n- Parameters values should be of the expected type.\n- The parameter list can't be empty or include duplicate parameters.\n- Parameters names are case-sensitive.\n- Parameter `IsRequired` must have a non-empty value.\n- The parameter types `Any` and `Binary` can't be updated.\n<br><br>"
  },
  {
    "operationId": "Datasets_UpdateDatasourcesInGroup",
    "method": "POST",
    "path": "/v1.0/myorg/groups/{groupId}/datasets/{datasetId}/Default.UpdateDatasources",
    "summary": "Updates the data sources of the specified dataset from the specified workspace.",
    "tags": [
      "Datasets"
    ],
    "category": "official",
    "description": "\n> [!NOTE]\n> We recommend using [enhanced dataset metadata](/power-bi/connect-data/desktop-enhanced-dataset-metadata) with this API call.\n\n> [!IMPORTANT]\n>\n> - The original data source and the new data source must have the exact same schema.\n> - If you're using **enhanced dataset metadata**, refresh the dataset to get data from the new data sources.\n> - If you're not using **enhanced dataset metadata**, wait 30 minutes for the update data sources operation to complete, and then refresh the dataset.\n\n## Permissions\n\n- The user must be the dataset owner.\n- This API call can be called by a service principal profile. For more information see: [Service principal profiles in Power BI Embedded](/power-bi/developer/embedded/embed-multi-tenancy).\n\n## Required Scope\n\nDataset.ReadWrite.All\n\n## Limitations\n\n- Datasets created or modified using the public [XMLA endpoint](/power-bi/admin/service-premium-connect-tools) aren't supported. To make changes to those data sources, the admin must use the Azure Analysis Services client library for Tabular Object Model.\n- Only these data sources are supported: SQL Server, Azure SQL Server, Azure Analysis Services, Azure Synapse, OData, SharePoint, Teradata, and SAP HANA. For other data sources, use the [Update Parameters In Group](/rest/api/power-bi/datasets/update-parameters-in-group) API call.\n- Changing the data source type isn't supported.\n- Data sources that contain parameters in the connection string aren't supported.\n- Updating data sources that are part of merged or joined tables is only supported if you're using [enhanced dataset metadata](/power-bi/connect-data/desktop-enhanced-dataset-metadata).\n- For an Advanced Query that reference multiple data sources, only the first data source will be updated. To overcome this limitation, define the data source as a parameter and use the [Update Parameters In Group](/rest/api/power-bi/datasets/update-parameters-in-group) API call.\n- Datasets with incremental refresh policy are not fully supported, calling this API may not work as expected and result of partial datasources update, to overcome this you can try run a dataset refresh before calling this API.\n<br><br>"
  },
  {
    "operationId": "Admin_GetActivityEvents",
    "method": "GET",
    "path": "/v1.0/myorg/admin/activityevents",
    "summary": "Returns a list of audit activity events for a tenant.",
    "tags": [
      "Admin"
    ],
    "category": "official",
    "description": "\nProvide either a continuation token or both a start and end date time. `StartDateTime` and `EndDateTime` must be in the same UTC day, within the last 28 days, and should be wrapped in single quotes.\n\n## Permissions\n\n- The user must be a Fabric administrator or authenticate using a service principal.\n- Delegated permissions are supported.\n\nWhen running under service prinicipal authentication, an app **must not** have any admin-consent required premissions for Power BI set on it in the Azure portal.\n\n## Required Scope\n\nTenant.Read.All or Tenant.ReadWrite.All\n\nRelevant only when authenticating via a standard delegated admin access token. Must not be present when authentication via a service principal is used.\n\n## Limitations\n\n- Maximum 200 requests per hour.\n- Activity logging isn't supported for Microsoft Cloud Deutschland.\n<br><br>"
  }
];
const existing = JSON.parse(localStorage.getItem('pbi-bookmarks') || '[]');

// Merge - avoid duplicates
newBookmarks.forEach(nb => {
  const cleanNew = nb.path.replace('/v1.0/myorg', '');
  const already = existing.some(b => {
    const cleanB = (b.path || '').replace('/v1.0/myorg', '');
    return cleanB === cleanNew && (b.method||'').toUpperCase() === nb.method.toUpperCase();
  });
  if (!already) existing.push(nb);
});
localStorage.setItem('pbi-bookmarks', JSON.stringify(existing));
console.log('Bookmarks saved:', existing.length);
