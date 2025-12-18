import React from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Badge,
  Tabs,
  Tab,
  Chip,
  Divider,
  Select,
  SelectItem,
  Accordion,
  AccordionItem,
  Avatar,
  Progress,
  Spinner,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useDataBuilderStore } from "../../stores/useDataBuilderStore";

interface RelationshipTreeNode {
  id: string;
  name: string;
  type: "group" | "range" | "product";
  code?: string;
  overview?: string;
  description?: string;
  children?: RelationshipTreeNode[];
  hasIssues?: boolean;
}

export const RelationshipsManager: React.FC = () => {
  const {
    productGroups,
    productRanges,
    products,
    relationships,
    linkRangeToGroup,
    unlinkRangeFromGroup,
    linkProductToRange,
    unlinkProductFromRange,
  } = useDataBuilderStore();

  const [selectedGroup, setSelectedGroup] = React.useState<string | null>(null);
  const [selectedRange, setSelectedRange] = React.useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);

  // Build relationship tree
  const buildRelationshipTree = (): RelationshipTreeNode[] => {
    return productGroups.map((group) => {
      const groupRanges = relationships.groupToRanges[group.id] || [];
      const rangeNodes: RelationshipTreeNode[] = groupRanges
        .map((rangeId) => {
          const range = productRanges.find((r) => r.id === rangeId);
          const rangeProducts = relationships.rangeToProducts[rangeId] || [];
          const productNodes: RelationshipTreeNode[] = rangeProducts
            .map((productId) => {
              const product = products.find((p) => p.id === productId);
              return {
                id: productId,
                name: product?.name || "Unknown Product",
                code: product?.code,
                overview: product?.overview,
                type: "product" as const,
                hasIssues: !product,
              };
            })
            .filter(Boolean);

          return {
            id: rangeId,
            name: range?.name || "Unknown Range",
            description: range?.description,
            type: "range" as const,
            children: productNodes,
            hasIssues: !range || rangeProducts.length === 0,
          };
        })
        .filter(Boolean);

      return {
        id: group.id,
        name: group.name,
        description: group.description,
        type: "group" as const,
        children: rangeNodes,
        hasIssues: groupRanges.length === 0,
      };
    });
  };

  // Get orphaned items (not linked to anything)
  const getOrphanedItems = () => {
    const orphanedRanges = productRanges.filter(
      (range) => !Object.values(relationships.groupToRanges).some((ranges) => ranges.includes(range.id))
    );

    const orphanedProducts = products.filter(
      (product) => !Object.values(relationships.rangeToProducts).some((products) => products.includes(product.id))
    );

    return { orphanedRanges, orphanedProducts };
  };

  // Get relationship statistics
  const getRelationshipStats = () => {
    const { orphanedRanges, orphanedProducts } = getOrphanedItems();
    const totalConnections =
      Object.values(relationships.groupToRanges).reduce((sum, ranges) => sum + ranges.length, 0) +
      Object.values(relationships.rangeToProducts).reduce((sum, products) => sum + products.length, 0);

    const completionRate = Math.round(
      ((productGroups.length -
        productGroups.filter((g) => (relationships.groupToRanges[g.id] || []).length === 0).length +
        (productRanges.length - orphanedRanges.length) +
        (products.length - orphanedProducts.length)) /
        (productGroups.length + productRanges.length + products.length)) *
        100
    );

    return {
      totalConnections,
      orphanedRanges: orphanedRanges.length,
      orphanedProducts: orphanedProducts.length,
      completionRate: isNaN(completionRate) ? 0 : completionRate,
    };
  };

  const handleLinkRangeToGroup = (groupId: string, rangeId: string) => {
    linkRangeToGroup(groupId, rangeId);
  };

  const handleUnlinkRangeFromGroup = (groupId: string, rangeId: string) => {
    unlinkRangeFromGroup(groupId, rangeId);
  };

  const handleLinkProductToRange = (rangeId: string, productId: string) => {
    linkProductToRange(rangeId, productId);
  };

  const handleUnlinkProductFromRange = (rangeId: string, productId: string) => {
    unlinkProductFromRange(rangeId, productId);
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    // Simulate analysis delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsAnalyzing(false);
  };

  const relationshipTree = buildRelationshipTree();
  const { orphanedRanges, orphanedProducts } = getOrphanedItems();
  const stats = getRelationshipStats();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-semibold">Relationship Manager</h3>
          <p className="text-sm text-foreground-500">Manage connections between groups, ranges, and products</p>
        </div>
        <div className="flex gap-2">
          <Button
            color="secondary"
            variant="flat"
            onPress={runAnalysis}
            startContent={<Icon icon="lucide:search" width={18} />}
            isLoading={isAnalyzing}
          >
            {isAnalyzing ? "Analyzing..." : "Analyze Structure"}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">{stats.totalConnections}</div>
              <div className="text-sm text-foreground-500">Total Connections</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning-600">{stats.orphanedRanges}</div>
              <div className="text-sm text-foreground-500">Orphaned Ranges</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-danger-600">{stats.orphanedProducts}</div>
              <div className="text-sm text-foreground-500">Orphaned Products</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success-600">{stats.completionRate}%</div>
              <div className="text-sm text-foreground-500">Structure Complete</div>
              <Progress
                value={stats.completionRate}
                color={stats.completionRate > 80 ? "success" : stats.completionRate > 50 ? "warning" : "danger"}
                size="sm"
                className="mt-1"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <Tabs aria-label="Relationship Views" defaultSelectedKey="tree">
        <Tab
          key="tree"
          title={
            <div className="flex items-center gap-2">
              <Icon icon="lucide:git-branch" width={16} />
              Tree View
            </div>
          }
        >
          <div className="space-y-4">
            {relationshipTree.length === 0 ? (
              <Card>
                <CardBody className="text-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <Icon icon="lucide:git-branch" width={48} className="text-foreground-300" />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground-600">No Structure Yet</h3>
                      <p className="text-sm text-foreground-500">Create groups, ranges, and products to see the relationship tree</p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ) : (
              <Accordion selectionMode="multiple" variant="bordered">
                {relationshipTree.map((group) => (
                  <AccordionItem
                    key={group.id}
                    title={
                      <div className="flex items-center gap-3">
                        <Avatar
                          icon={<Icon icon="lucide:folder" width={16} style={{ stroke: 'currentColor', fill: 'currentColor' }} />}
                          className="w-6 h-6 bg-primary-100 text-primary-600"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{group.name}</span>
                            {group.hasIssues && <Icon icon="lucide:alert-triangle" width={16} className="text-warning-500" />}
                          </div>
                          <div className="text-xs text-foreground-500">{group.description || "No description"}</div>
                        </div>
                        <Badge classNames={{ base: "absolute" }} content={group.children?.length || 0} color="primary" size="sm">
                          <div className="w-4 h-4" />
                        </Badge>
                      </div>
                    }
                    classNames={{ indicator: "-rotate-90 data-[open=true]:rotate-90 rtl:-rotate-180" }}
                  >
                    {group.children && group.children.length > 0 ? (
                      <div className="space-y-3 pl-4">
                        {group.children.map((range) => (
                          <div key={range.id} className="border-l-2 border-gray-200 pl-4">
                            <div className="flex items-center gap-3 mb-2">
                              <Avatar
                                icon={<Icon icon="lucide:grid-3x3" width={16} style={{ stroke: 'currentColor', fill: 'currentColor' }} />}
                                className="w-6 h-6 bg-secondary-100 text-secondary-600"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{range.name}</span>
                                  {range.hasIssues && <Icon icon="lucide:alert-triangle" width={16} className="text-warning-500" />}
                                </div>
                                <div className="text-xs text-foreground-500">{range.description || "No description"}</div>
                              </div>
                              <Badge classNames={{ base: "absolute" }} content={range.children?.length || 0} color="secondary" size="sm">
                                <div className="w-4 h-4" />
                              </Badge>
                            </div>

                            {range.children && range.children.length > 0 && (
                              <div className="space-y-2 pl-8">
                                {range.children.map((product) => (
                                  <div key={product.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                                    <Avatar
                                      icon={<Icon icon="lucide:package" width={16} />}
                                      className="w-5 h-5 bg-success-100 text-success-600"
                                    />
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">{product.name}</span>
                                        {product.code && (
                                          <Chip size="sm" variant="flat" color="success">
                                            {product.code}
                                          </Chip>
                                        )}
                                        {product.hasIssues && <Icon icon="lucide:alert-triangle" width={14} className="text-warning-500" />}
                                      </div>
                                      {product.overview && <div className="text-xs text-foreground-500">{product.overview}</div>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-foreground-400">
                        <Icon icon="lucide:inbox" width={32} className="mx-auto mb-2" />
                        <p className="text-sm">No ranges linked to this group</p>
                      </div>
                    )}
                  </AccordionItem>
                ))}
              </Accordion>
            )}

            {/* Orphaned Items */}
            {(orphanedRanges.length > 0 || orphanedProducts.length > 0) && (
              <Card className="border-warning-200 bg-warning-50">
                <CardHeader>
                  <div className="flex items-center gap-2 text-warning-700">
                    <Icon icon="lucide:alert-triangle" width={20} />
                    <h4 className="font-semibold">Orphaned Items</h4>
                  </div>
                </CardHeader>
                <CardBody className="pt-0">
                  {orphanedRanges.length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-medium text-sm mb-2">Unlinked Ranges:</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {orphanedRanges.map((range) => (
                          <div key={range.id} className="flex items-center gap-2 p-2 bg-white rounded border">
                            <Icon icon="lucide:grid-3x3" width={16} className="text-secondary-600" />
                            <span className="text-sm">{range.name}</span>
                            <span className="text-xs text-gray-500">{range.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {orphanedProducts.length > 0 && (
                    <div>
                      <h5 className="font-medium text-sm mb-2">Unlinked Products:</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {orphanedProducts.map((product) => (
                          <div key={product.id} className="flex items-center gap-2 p-2 bg-white rounded border">
                            <Icon icon="lucide:package" width={16} className="text-success-600" />
                            <span className="text-sm">{product.name}</span>
                            <Chip size="sm" variant="flat" color="success">
                              {product.code}
                            </Chip>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            )}
          </div>
        </Tab>

        <Tab
          key="manage"
          title={
            <div className="flex items-center gap-2">
              <Icon icon="lucide:link" width={16} />
              Manage Links
            </div>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Group to Range Relationships */}
            <Card>
              <CardHeader>
                <h4 className="font-semibold flex items-center gap-2">
                  <Icon icon="lucide:arrow-right" width={16} />
                  Group → Range Links
                </h4>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <Select
                    label="Select Group"
                    placeholder="Choose a product group"
                    selectedKeys={selectedGroup ? new Set([selectedGroup]) : new Set()}
                    onSelectionChange={(keys) => setSelectedGroup((Array.from(keys)[0] as string) || null)}
                  >
                    {productGroups.map((group) => (
                      <SelectItem key={group.id}>{group.name}</SelectItem>
                    ))}
                  </Select>

                  {selectedGroup && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground-700">Available Ranges:</p>
                      {productRanges.map((range) => {
                        const isLinked = (relationships.groupToRanges[selectedGroup] || []).includes(range.id);
                        return (
                          <div key={range.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Icon icon="lucide:grid-3x3" width={16} className="text-secondary-600" />
                              <div>
                                <div className="font-medium text-sm">{range.name}</div>
                                <div className="text-xs text-foreground-500">{range.description}</div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              color={isLinked ? "danger" : "primary"}
                              variant={isLinked ? "flat" : "solid"}
                              onPress={() => {
                                if (isLinked) {
                                  handleUnlinkRangeFromGroup(selectedGroup, range.id);
                                } else {
                                  handleLinkRangeToGroup(selectedGroup, range.id);
                                }
                              }}
                            >
                              {isLinked ? "Unlink" : "Link"}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* Range to Product Relationships */}
            <Card>
              <CardHeader>
                <h4 className="font-semibold flex items-center gap-2">
                  <Icon icon="lucide:arrow-right" width={16} />
                  Range → Product Links
                </h4>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <Select
                    label="Select Range"
                    placeholder="Choose a product range"
                    selectedKeys={selectedRange ? new Set([selectedRange]) : new Set()}
                    onSelectionChange={(keys) => setSelectedRange((Array.from(keys)[0] as string) || null)}
                  >
                    {productRanges.map((range) => (
                      <SelectItem key={range.id}>{range.name}</SelectItem>
                    ))}
                  </Select>

                  {selectedRange && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground-700">Available Products:</p>
                      {products.map((product) => {
                        const isLinked = (relationships.rangeToProducts[selectedRange] || []).includes(product.id);
                        return (
                          <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Icon icon="lucide:package" width={16} className="text-success-600" />
                              <div>
                                <div className="font-medium text-sm">{product.name}</div>
                                <div className="text-xs text-foreground-500">{product.code}</div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              color={isLinked ? "danger" : "primary"}
                              variant={isLinked ? "flat" : "solid"}
                              onPress={() => {
                                if (isLinked) {
                                  handleUnlinkProductFromRange(selectedRange, product.id);
                                } else {
                                  handleLinkProductToRange(selectedRange, product.id);
                                }
                              }}
                            >
                              {isLinked ? "Unlink" : "Link"}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        </Tab>

        <Tab
          key="analysis"
          title={
            <div className="flex items-center gap-2">
              <Icon icon="lucide:bar-chart-3" width={16} />
              Analysis
            </div>
          }
        >
          <div className="space-y-6">
            {isAnalyzing ? (
              <Card>
                <CardBody className="text-center py-12">
                  <Spinner size="lg" color="primary" />
                  <p className="mt-4 text-foreground-600">Analyzing relationship structure...</p>
                </CardBody>
              </Card>
            ) : (
              <>
                {/* Detailed Statistics */}
                <Card>
                  <CardHeader>
                    <h4 className="font-semibold">Structure Analysis</h4>
                  </CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h5 className="font-medium text-sm mb-2">Groups</h5>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Total Groups</span>
                            <span className="text-sm font-medium">{productGroups.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">With Ranges</span>
                            <span className="text-sm font-medium">
                              {productGroups.filter((g) => (relationships.groupToRanges[g.id] || []).length > 0).length}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Empty Groups</span>
                            <span className="text-sm font-medium text-warning-600">
                              {productGroups.filter((g) => (relationships.groupToRanges[g.id] || []).length === 0).length}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium text-sm mb-2">Ranges</h5>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Total Ranges</span>
                            <span className="text-sm font-medium">{productRanges.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Linked to Groups</span>
                            <span className="text-sm font-medium">{productRanges.length - orphanedRanges.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">With Products</span>
                            <span className="text-sm font-medium">
                              {productRanges.filter((r) => (relationships.rangeToProducts[r.id] || []).length > 0).length}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium text-sm mb-2">Products</h5>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Total Products</span>
                            <span className="text-sm font-medium">{products.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Linked to Ranges</span>
                            <span className="text-sm font-medium">{products.length - orphanedProducts.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Orphaned</span>
                            <span className="text-sm font-medium text-danger-600">{orphanedProducts.length}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* Recommendations */}
                <Card>
                  <CardHeader>
                    <h4 className="font-semibold flex items-center gap-2">
                      <Icon icon="lucide:lightbulb" width={16} />
                      Recommendations
                    </h4>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-3">
                      {stats.orphanedProducts > 0 && (
                        <div className="flex items-start gap-3 p-3 bg-danger-50 rounded-lg border border-danger-200">
                          <Icon icon="lucide:alert-triangle" width={16} className="text-danger-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-danger-800">
                              You have {stats.orphanedProducts} unlinked product{stats.orphanedProducts !== 1 ? "s" : ""}
                            </p>
                            <p className="text-xs text-danger-600">Link these products to ranges so they appear in your product stepper.</p>
                          </div>
                        </div>
                      )}

                      {stats.orphanedRanges > 0 && (
                        <div className="flex items-start gap-3 p-3 bg-warning-50 rounded-lg border border-warning-200">
                          <Icon icon="lucide:alert-triangle" width={16} className="text-warning-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-warning-800">
                              You have {stats.orphanedRanges} unlinked range{stats.orphanedRanges !== 1 ? "s" : ""}
                            </p>
                            <p className="text-xs text-warning-600">Link these ranges to product groups to organize your structure.</p>
                          </div>
                        </div>
                      )}

                      {productGroups.filter((g) => (relationships.groupToRanges[g.id] || []).length === 0).length > 0 && (
                        <div className="flex items-start gap-3 p-3 bg-primary-50 rounded-lg border border-primary-200">
                          <Icon icon="lucide:info" width={16} className="text-primary-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-primary-800">Some product groups are empty</p>
                            <p className="text-xs text-primary-600">Consider linking ranges to these groups or removing unused groups.</p>
                          </div>
                        </div>
                      )}

                      {stats.completionRate >= 90 && (
                        <div className="flex items-start gap-3 p-3 bg-success-50 rounded-lg border border-success-200">
                          <Icon icon="lucide:check-circle" width={16} className="text-success-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-success-800">Great job! Your structure is well organized</p>
                            <p className="text-xs text-success-600">Your data structure is ready for the product stepper.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </>
            )}
          </div>
        </Tab>
      </Tabs>
    </div>
  );
};
