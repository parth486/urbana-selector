import React, { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Checkbox,
  Spinner,
  Tabs,
  Tab,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useDataBuilderStore } from "../../stores/useDataBuilderStore";

interface FolderItem {
  path: string;
  name: string;
  type: "group" | "range" | "product";
  exists_do: boolean;  // Exists in Digital Ocean
  exists_site: boolean; // Exists in site data
  synced: boolean;      // Both match
  checked: boolean;
}

interface GroupedFolders {
  groups: FolderItem[];
  ranges: FolderItem[];
  products: FolderItem[];
}

export const BiDirectionalSync: React.FC = () => {
  const { productGroups, productRanges, products, relationships } = useDataBuilderStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [folders, setFolders] = useState<GroupedFolders>({
    groups: [],
    ranges: [],
    products: [],
  });
  const [doFolders, setDoFolders] = useState<string[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch all folders from Digital Ocean
  const fetchDigitalOceanFolders = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const windowData = (window as any).urbanaAdmin;
      console.log('Fetching DO folders...', { ajaxUrl: windowData?.ajaxUrl, forceRefresh });
      
      const url = new URL(windowData.ajaxUrl);
      url.searchParams.append('action', 'urbana_list_all_folders');
      url.searchParams.append('_wpnonce', windowData.nonce);
      if (forceRefresh) {
        url.searchParams.append('force_refresh', 'true');
      }
      
      const response = await fetch(url.toString(), {
        method: "GET",
        credentials: "same-origin",
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response data:', result);

      if (result.success && result.data && result.data.folders) {
        console.log('Setting DO folders:', result.data.folders);
        console.log('Total DO folders count:', result.data.folders.length);
        console.log('First 10 folders:', result.data.folders.slice(0, 10));
        setDoFolders(result.data.folders);
      } else if (result.success === false && result.data && result.data.message) {
        console.error('Error from server:', result.data.message);
        setFetchError(result.data.message);
        setDoFolders([]); // Set empty array to still show site items
      } else {
        console.error('Unexpected response format:', result);
        setFetchError('Unexpected response from server');
        setDoFolders([]); // Set empty array to still show site items
      }
    } catch (error) {
      console.error("Failed to fetch DO folders:", error);
      setFetchError(error instanceof Error ? error.message : 'Network error');
      setDoFolders([]); // Set empty array to still show site items
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Build folder comparison
  const buildFolderComparison = useCallback(() => {
    const groupFolders: FolderItem[] = [];
    const rangeFolders: FolderItem[] = [];
    const productFolders: FolderItem[] = [];

    // Helper to check if folder exists in DO
    const existsInDO = (path: string) => {
      const pathLower = path.toLowerCase();
      return doFolders.some(f => f.toLowerCase() === pathLower);
    };

    // Process Product Groups
    productGroups.forEach(group => {
      const exists_do = existsInDO(group.name);
      groupFolders.push({
        path: group.name,
        name: group.name,
        type: "group",
        exists_do,
        exists_site: true,
        synced: exists_do,
        checked: false,
      });
    });

    // Check for DO groups not in site
    const addedDOGroups = new Set<string>(); // Track added DO groups (case-insensitive)
    doFolders.forEach(folder => {
      // Only top-level folders are groups
      if (!folder.includes('/')) {
        const folderLower = folder.toLowerCase();
        const existsInSite = productGroups.some(g => 
          g.name.toLowerCase() === folderLower
        );
        // Skip if already added a case-variant or exists in site
        if (!existsInSite && !addedDOGroups.has(folderLower)) {
          groupFolders.push({
            path: folder,
            name: folder,
            type: "group",
            exists_do: true,
            exists_site: false,
            synced: false,
            checked: false,
          });
          addedDOGroups.add(folderLower);
        }
      }
    });

    // Process Product Ranges
    productRanges.forEach(range => {
      // Find parent group
      const groupId = Object.entries(relationships.groupToRanges).find(([, rangeIds]) =>
        rangeIds.includes(range.id)
      )?.[0];
      const group = groupId ? productGroups.find(g => g.id === groupId) : null;
      
      const path = group ? `${group.name}/${range.name}` : range.name;
      const exists_do = existsInDO(path);
      
      rangeFolders.push({
        path,
        name: range.name,
        type: "range",
        exists_do,
        exists_site: true,
        synced: exists_do,
        checked: false,
      });
    });

    // Check for DO ranges not in site
    const addedDORanges = new Set<string>(); // Track added DO ranges (case-insensitive)
    doFolders.forEach(folder => {
      const parts = folder.split('/');
      if (parts.length === 2) { // Group/Range format
        const folderLower = folder.toLowerCase();
        const existsInSite = productRanges.some(r => {
          const groupId = Object.entries(relationships.groupToRanges).find(([, rangeIds]) =>
            rangeIds.includes(r.id)
          )?.[0];
          const group = groupId ? productGroups.find(g => g.id === groupId) : null;
          const sitePath = group ? `${group.name}/${r.name}` : r.name;
          return sitePath.toLowerCase() === folderLower;
        });
        
        // Skip if already added a case-variant or exists in site
        if (!existsInSite && !addedDORanges.has(folderLower)) {
          rangeFolders.push({
            path: folder,
            name: parts[1],
            type: "range",
            exists_do: true,
            exists_site: false,
            synced: false,
            checked: false,
          });
          addedDORanges.add(folderLower);
        }
      }
    });

    // Process Products
    products.forEach(product => {
      // Find range and group
      const rangeId = Object.entries(relationships.rangeToProducts).find(([, productIds]) =>
        productIds.includes(product.id)
      )?.[0];
      const range = rangeId ? productRanges.find(r => r.id === rangeId) : null;
      
      let path = product.code;
      if (range) {
        const groupId = Object.entries(relationships.groupToRanges).find(([, rangeIds]) =>
          rangeIds.includes(range.id)
        )?.[0];
        const group = groupId ? productGroups.find(g => g.id === groupId) : null;
        
        if (group) {
          path = `${group.name}/${range.name}/${product.code}`;
        } else {
          path = `${range.name}/${product.code}`;
        }
      }
      
      const exists_do = existsInDO(path);
      
      productFolders.push({
        path,
        name: product.name,
        type: "product",
        exists_do,
        exists_site: true,
        synced: exists_do,
        checked: false,
      });
    });

    // Check for DO products not in site
    const addedDOProducts = new Set<string>(); // Track added DO products (case-insensitive)
    doFolders.forEach(folder => {
      const parts = folder.split('/');
      console.log('Checking DO folder:', folder, 'parts:', parts);
      if (parts.length === 3) { // Group/Range/Product format
        const folderLower = folder.toLowerCase();
        const productCode = parts[2];
        const existsInSite = products.some(p => p.code.toLowerCase() === productCode.toLowerCase());
        
        console.log('Product check:', { folder, productCode, existsInSite });
        
        // Skip if already added a case-variant or exists in site
        if (!existsInSite && !addedDOProducts.has(folderLower)) {
          productFolders.push({
            path: folder,
            name: productCode,
            type: "product",
            exists_do: true,
            exists_site: false,
            synced: false,
            checked: false,
          });
          addedDOProducts.add(folderLower);
        }
      }
    });

    setFolders({
      groups: groupFolders.sort((a, b) => a.name.localeCompare(b.name)),
      ranges: rangeFolders.sort((a, b) => a.name.localeCompare(b.name)),
      products: productFolders.sort((a, b) => a.name.localeCompare(b.name)),
    });

    console.log('Built folder comparison:', {
      groups: groupFolders.length,
      ranges: rangeFolders.length,
      products: productFolders.length,
      doFoldersCount: doFolders.length,
      productGroupsCount: productGroups.length,
      productRangesCount: productRanges.length,
      productsCount: products.length,
    });
  }, [productGroups, productRanges, products, relationships, doFolders]);

  // Initial load
  useEffect(() => {
    console.log('BiDirectionalSync mounted');
    fetchDigitalOceanFolders();
  }, [fetchDigitalOceanFolders]);

  // Rebuild comparison when data changes (always build, even with empty DO folders)
  useEffect(() => {
    console.log('Building folder comparison...', {
      hasDoFolders: doFolders.length > 0,
      hasGroups: productGroups.length > 0,
      hasRanges: productRanges.length > 0,
      hasProducts: products.length > 0,
    });
    buildFolderComparison();
  }, [doFolders, productGroups, productRanges, products, buildFolderComparison]);

  // Toggle checkbox
  const handleToggle = (type: keyof GroupedFolders, index: number) => {
    setFolders(prev => ({
      ...prev,
      [type]: prev[type].map((item, i) => 
        i === index ? { ...item, checked: !item.checked } : item
      ),
    }));
  };

  // Select all in category
  const handleSelectAll = (type: keyof GroupedFolders, checked: boolean) => {
    setFolders(prev => ({
      ...prev,
      [type]: prev[type].map(item => ({ ...item, checked })),
    }));
  };

  // Sync selected to DO
  const syncToDigitalOcean = async () => {
    setIsSyncing(true);
    try {
      const toSync: string[] = [];
      
      Object.values(folders).flat().forEach(item => {
        if (item.checked && item.exists_site && !item.exists_do) {
          toSync.push(item.path);
        }
      });

      if (toSync.length === 0) {
        alert("No folders selected to sync to Digital Ocean");
        return;
      }

      const windowData = (window as any).urbanaAdmin;
      const formData = new FormData();
      formData.append('action', 'urbana_sync_folders_to_do');
      formData.append('_wpnonce', windowData.nonce);
      formData.append('folders', JSON.stringify(toSync));

      const response = await fetch(windowData.ajaxUrl, {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });

      const result = await response.json();
      console.log('Sync result:', result);

      if (result.success) {
        alert(`Successfully synced ${toSync.length} folder(s) to Digital Ocean`);
        fetchDigitalOceanFolders();
      } else {
        alert(`Sync failed: ${result.data?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Sync failed:", error);
      alert("Failed to sync folders");
    } finally {
      setIsSyncing(false);
    }
  };

  // Import selected from DO to site
  const importFromDigitalOcean = async () => {
    setIsSyncing(true);
    try {
      const { addProductGroup, addProductRange, addProduct, linkRangeToGroup, linkProductToRange } = useDataBuilderStore.getState();
      
      const selectedItems: FolderItem[] = [];
      Object.values(folders).flat().forEach(item => {
        if (item.checked && item.exists_do && !item.exists_site) {
          selectedItems.push(item);
        }
      });

      if (selectedItems.length === 0) {
        alert("No 'DO Only' items selected to import");
        return;
      }

      let importedCount = 0;
      const errors: string[] = [];

      // Sort items by type: groups first, then ranges, then products
      const sortedItems = selectedItems.sort((a, b) => {
        const order = { group: 0, range: 1, product: 2 };
        return order[a.type] - order[b.type];
      });

      for (const item of sortedItems) {
        try {
          const parts = item.path.split('/');
          
          if (item.type === 'group') {
            // Import group
            const groupName = parts[0];
            addProductGroup({
              name: groupName,
              icon: 'lucide:folder',
              description: `Imported from Digital Ocean`,
              active: true,
            });
            importedCount++;
            console.log('Imported group:', groupName);
            
          } else if (item.type === 'range') {
            // Import range - need to find or create parent group
            const groupName = parts[0];
            const rangeName = parts[1];
            
            let group = productGroups.find(g => g.name.toLowerCase() === groupName.toLowerCase());
            if (!group) {
              // Create parent group if it doesn't exist
              const newGroupId = crypto.randomUUID();
              addProductGroup({
                name: groupName,
                icon: 'lucide:folder',
                description: `Auto-created during import`,
                active: true,
              });
              // Re-fetch to get the created group
              group = useDataBuilderStore.getState().productGroups.find(g => g.name.toLowerCase() === groupName.toLowerCase());
            }
            
            if (group) {
              const newRangeId = crypto.randomUUID();
              addProductRange({
                name: rangeName,
                image: '',
                description: `Imported from Digital Ocean`,
                tags: [],
                active: true,
              });
              // Re-fetch to get the created range
              const newRange = useDataBuilderStore.getState().productRanges.find(r => r.name.toLowerCase() === rangeName.toLowerCase());
              if (newRange) {
                linkRangeToGroup(group.id, newRange.id);
              }
              importedCount++;
              console.log('Imported range:', rangeName);
            }
            
          } else if (item.type === 'product') {
            // Import product - need to find or create parent group and range
            const groupName = parts[0];
            const rangeName = parts[1];
            const productCode = parts[2];
            
            let group = productGroups.find(g => g.name.toLowerCase() === groupName.toLowerCase());
            if (!group) {
              addProductGroup({
                name: groupName,
                icon: 'lucide:folder',
                description: `Auto-created during import`,
                active: true,
              });
              group = useDataBuilderStore.getState().productGroups.find(g => g.name.toLowerCase() === groupName.toLowerCase());
            }
            
            let range = productRanges.find(r => r.name.toLowerCase() === rangeName.toLowerCase());
            if (!range && group) {
              addProductRange({
                name: rangeName,
                image: '',
                description: `Auto-created during import`,
                tags: [],
                active: true,
              });
              range = useDataBuilderStore.getState().productRanges.find(r => r.name.toLowerCase() === rangeName.toLowerCase());
              if (range) {
                linkRangeToGroup(group.id, range.id);
              }
            }
            
            if (range) {
              addProduct({
                name: productCode,
                code: productCode,
                overview: `Imported from Digital Ocean`,
                description: '',
                specifications: [],
                imageGallery: [],
                files: {},
                active: true,
              });
              const newProduct = useDataBuilderStore.getState().products.find(p => p.code.toLowerCase() === productCode.toLowerCase());
              if (newProduct) {
                linkProductToRange(range.id, newProduct.id);
              }
              importedCount++;
              console.log('Imported product:', productCode);
            }
          }
        } catch (error) {
          console.error(`Failed to import ${item.path}:`, error);
          errors.push(`${item.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (errors.length > 0) {
        alert(`Imported ${importedCount} item(s) with ${errors.length} error(s):\n\n${errors.join('\n')}`);
      } else {
        alert(`Successfully imported ${importedCount} item(s) from Digital Ocean!`);
      }
      
      // Refresh to update sync status
      fetchDigitalOceanFolders(true);
      
    } catch (error) {
      console.error("Import failed:", error);
      alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Render folder list
  const renderFolderList = (items: FolderItem[], type: keyof GroupedFolders) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-8 text-foreground-500">
          <Icon icon="lucide:folder-x" width={48} className="mx-auto mb-2 opacity-50" />
          <p>No items found</p>
        </div>
      );
    }

    const selectedCount = items.filter(i => i.checked).length;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="flat"
              onPress={() => handleSelectAll(type, true)}
              startContent={<Icon icon="lucide:check-square" width={14} />}
            >
              Select All
            </Button>
            <Button
              size="sm"
              variant="flat"
              onPress={() => handleSelectAll(type, false)}
              startContent={<Icon icon="lucide:square" width={14} />}
            >
              Clear
            </Button>
          </div>
          {selectedCount > 0 && (
            <Chip size="sm" color="primary" variant="flat">
              {selectedCount} selected
            </Chip>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2">
          {items.map((item, index) => (
            <Card
              key={item.path}
              className={`cursor-pointer border-2 transition-all ${
                item.checked
                  ? "border-primary bg-primary/5"
                  : "border-transparent hover:border-default-300"
              }`}
              isPressable
              onPress={() => handleToggle(type, index)}
            >
              <CardBody className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      isSelected={item.checked}
                      onValueChange={() => handleToggle(type, index)}
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-foreground-500">{item.path}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.synced ? (
                      <Chip size="sm" color="success" variant="flat" startContent={<Icon icon="lucide:check-circle" width={14} />}>
                        Synced
                      </Chip>
                    ) : (
                      <>
                        {item.exists_site && (
                          <Chip size="sm" color="primary" variant="dot">
                            Site
                          </Chip>
                        )}
                        {item.exists_do && (
                          <Chip size="sm" color="secondary" variant="dot">
                            DO
                          </Chip>
                        )}
                        {!item.exists_site && item.exists_do && (
                          <Chip size="sm" color="warning" variant="flat" startContent={<Icon icon="lucide:cloud" width={14} />}>
                            DO Only
                          </Chip>
                        )}
                        {item.exists_site && !item.exists_do && (
                          <Chip size="sm" color="warning" variant="flat" startContent={<Icon icon="lucide:database" width={14} />}>
                            Site Only
                          </Chip>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const stats = {
    groups: {
      total: folders.groups.length,
      synced: folders.groups.filter(f => f.synced).length,
      siteOnly: folders.groups.filter(f => f.exists_site && !f.exists_do).length,
      doOnly: folders.groups.filter(f => !f.exists_site && f.exists_do).length,
    },
    ranges: {
      total: folders.ranges.length,
      synced: folders.ranges.filter(f => f.synced).length,
      siteOnly: folders.ranges.filter(f => f.exists_site && !f.exists_do).length,
      doOnly: folders.ranges.filter(f => !f.exists_site && f.exists_do).length,
    },
    products: {
      total: folders.products.length,
      synced: folders.products.filter(f => f.synced).length,
      siteOnly: folders.products.filter(f => f.exists_site && !f.exists_do).length,
      doOnly: folders.products.filter(f => !f.exists_site && f.exists_do).length,
    },
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex gap-3">
          <Icon icon="lucide:refresh-cw" width={24} />
          <div className="flex flex-col flex-1">
            <p className="text-md font-semibold">Bi-Directional Sync Manager</p>
            <p className="text-small text-default-500">
              Compare and sync folders between your site and Digital Ocean Spaces
            </p>
          </div>
          <Button
            color="primary"
            variant="flat"
            onPress={() => fetchDigitalOceanFolders(true)}
            isLoading={isLoading}
            startContent={!isLoading ? <Icon icon="lucide:refresh-cw" width={16} /> : undefined}
          >
            Refresh
          </Button>
        </CardHeader>
        <CardBody>
          {fetchError && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg">
              <div className="flex items-center gap-2 text-danger">
                <Icon icon="lucide:alert-circle" width={20} />
                <div>
                  <p className="font-semibold">Error fetching Digital Ocean folders</p>
                  <p className="text-sm">{fetchError}</p>
                  {fetchError.includes('not configured') && (
                    <p className="text-xs mt-1">Please configure Digital Ocean Spaces in Settings</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {!fetchError && doFolders.length === 0 && !isLoading && (
            <div className="mb-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="flex items-center gap-2 text-warning">
                <Icon icon="lucide:info" width={20} />
                <div>
                  <p className="font-semibold">No folders in Digital Ocean</p>
                  <p className="text-sm">All items shown are only in your site. Use "Sync to Digital Ocean" to create them.</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card className="bg-primary/10">
              <CardBody className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-foreground-500">Total Items</p>
                    <p className="text-2xl font-bold text-primary">
                      {stats.groups.total + stats.ranges.total + stats.products.total}
                    </p>
                  </div>
                  <Icon icon="lucide:folder" width={32} className="text-primary opacity-50" />
                </div>
              </CardBody>
            </Card>
            <Card className="bg-success/10">
              <CardBody className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-foreground-500">Synced</p>
                    <p className="text-2xl font-bold text-success">
                      {stats.groups.synced + stats.ranges.synced + stats.products.synced}
                    </p>
                  </div>
                  <Icon icon="lucide:check-circle" width={32} className="text-success opacity-50" />
                </div>
              </CardBody>
            </Card>
            <Card className="bg-warning/10">
              <CardBody className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-foreground-500">Need Sync</p>
                    <p className="text-2xl font-bold text-warning">
                      {stats.groups.siteOnly + stats.ranges.siteOnly + stats.products.siteOnly +
                       stats.groups.doOnly + stats.ranges.doOnly + stats.products.doOnly}
                    </p>
                  </div>
                  <Icon icon="lucide:alert-circle" width={32} className="text-warning opacity-50" />
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              color="primary"
              onPress={syncToDigitalOcean}
              isLoading={isSyncing}
              isDisabled={
                folders.groups.filter(f => f.checked && f.exists_site && !f.exists_do).length === 0 &&
                folders.ranges.filter(f => f.checked && f.exists_site && !f.exists_do).length === 0 &&
                folders.products.filter(f => f.checked && f.exists_site && !f.exists_do).length === 0
              }
              startContent={!isSyncing ? <Icon icon="lucide:cloud-upload" width={16} /> : undefined}
            >
              {isSyncing ? "Syncing..." : "Sync to Digital Ocean"}
            </Button>
            <Button
              color="secondary"
              variant="flat"
              isLoading={isSyncing}
              isDisabled={
                isSyncing ||
                (folders.groups.filter(f => f.checked && !f.exists_site && f.exists_do).length === 0 &&
                folders.ranges.filter(f => f.checked && !f.exists_site && f.exists_do).length === 0 &&
                folders.products.filter(f => f.checked && !f.exists_site && f.exists_do).length === 0)
              }
              startContent={!isSyncing ? <Icon icon="lucide:download-cloud" width={16} /> : undefined}
              onPress={importFromDigitalOcean}
            >
              Import from Digital Ocean
            </Button>
          </div>
        </CardBody>
      </Card>

      <Tabs aria-label="Folder Types">
        <Tab
          key="groups"
          title={
            <div className="flex items-center gap-2">
              <Icon icon="lucide:layers" width={16} />
              <span>Product Groups</span>
              <Chip size="sm" variant="flat">
                {stats.groups.total}
              </Chip>
            </div>
          }
        >
          <div className="mt-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : (
              renderFolderList(folders.groups, "groups")
            )}
          </div>
        </Tab>
        <Tab
          key="ranges"
          title={
            <div className="flex items-center gap-2">
              <Icon icon="lucide:grid-3x3" width={16} />
              <span>Product Ranges</span>
              <Chip size="sm" variant="flat">
                {stats.ranges.total}
              </Chip>
            </div>
          }
        >
          <div className="mt-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : (
              renderFolderList(folders.ranges, "ranges")
            )}
          </div>
        </Tab>
        <Tab
          key="products"
          title={
            <div className="flex items-center gap-2">
              <Icon icon="lucide:package" width={16} />
              <span>Products</span>
              <Chip size="sm" variant="flat">
                {stats.products.total}
              </Chip>
            </div>
          }
        >
          <div className="mt-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : (
              renderFolderList(folders.products, "products")
            )}
          </div>
        </Tab>
      </Tabs>
    </div>
  );
};
