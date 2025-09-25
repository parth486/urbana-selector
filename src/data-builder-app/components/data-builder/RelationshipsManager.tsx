import React from "react";
import { Card, CardBody, CardHeader, Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent 
} from '@dnd-kit/core';
import { 
  SortableContext, 
  sortableKeyboardCoordinates, 
  useSortable, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ProductGroup {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface ProductRange {
  id: string;
  name: string;
  image: string;
  description: string;
  tags: string[];
}

interface Product {
  id: string;
  code: string;
  name: string;
  overview: string;
  description: string;
  specifications: string[];
  imageGallery: string[];
  files: Record<string, string>;
}

interface Relationships {
  groupToRanges: Record<string, string[]>;
  rangeToProducts: Record<string, string[]>;
}

interface RelationshipsManagerProps {
  groups: ProductGroup[];
  ranges: ProductRange[];
  products: Product[];
  relationships: Relationships;
  onRelationshipsChange: (relationships: Relationships) => void;
}

interface DraggableItemProps {
  id: string;
  children: React.ReactNode;
}

const DraggableItem: React.FC<DraggableItemProps> = React.memo(({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  
  const style = transform ? {
    transform: CSS.Transform.toString(transform),
    transition,
  } : undefined;
  
  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 bg-content1 rounded-medium border border-default-200 mb-2 flex items-center justify-between cursor-move hover:border-primary transition-colors"
    >
      {children}
    </div>
  );
});

export const RelationshipsManager: React.FC<RelationshipsManagerProps> = ({
  groups,
  ranges,
  products,
  relationships,
  onRelationshipsChange
}) => {
  const [selectedGroup, setSelectedGroup] = React.useState<string | null>(null);
  const [selectedRange, setSelectedRange] = React.useState<string | null>(null);
  
  // Fix sensor configuration to make drag and drop more reliable
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Remove activation constraints that might be causing issues
      activationConstraint: {
        distance: 8, // Minimum distance to start dragging (pixels)
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Select first group and range by default if available
  React.useEffect(() => {
    if (groups.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0].id);
    }
  }, [groups, selectedGroup]);

  React.useEffect(() => {
    if (selectedGroup) {
      const associatedRanges = relationships.groupToRanges[selectedGroup] || [];
      if (associatedRanges.length > 0 && !selectedRange) {
        setSelectedRange(associatedRanges[0]);
      } else if (associatedRanges.length === 0) {
        setSelectedRange(null);
      }
    }
  }, [selectedGroup, relationships.groupToRanges, selectedRange]);

  // Stabilize handlers with useCallback
  const handleGroupSelect = React.useCallback((groupId: string) => {
    setSelectedGroup(groupId);
    setSelectedRange(null);
  }, []);

  const handleRangeSelect = React.useCallback((rangeId: string) => {
    setSelectedRange(rangeId);
  }, []);

  const handleAddRangeToGroup = React.useCallback((rangeId: string) => {
    if (!selectedGroup) return;
    
    const currentRanges = relationships.groupToRanges[selectedGroup] || [];
    
    // Don't add if already in the list
    if (currentRanges.includes(rangeId)) return;
    
    const newRelationships = {
      ...relationships,
      groupToRanges: {
        ...relationships.groupToRanges,
        [selectedGroup]: [...currentRanges, rangeId]
      }
    };
    
    onRelationshipsChange(newRelationships);
  }, [selectedGroup, relationships, onRelationshipsChange]);

  const handleRemoveRangeFromGroup = React.useCallback((rangeId: string) => {
    if (!selectedGroup) return;
    
    const currentRanges = relationships.groupToRanges[selectedGroup] || [];
    
    const newRelationships = {
      ...relationships,
      groupToRanges: {
        ...relationships.groupToRanges,
        [selectedGroup]: currentRanges.filter(id => id !== rangeId)
      }
    };
    
    onRelationshipsChange(newRelationships);
    
    // If we removed the selected range, clear it
    if (selectedRange === rangeId) {
      setSelectedRange(null);
    }
  }, [selectedGroup, selectedRange, relationships, onRelationshipsChange]);

  const handleAddProductToRange = React.useCallback((productId: string) => {
    if (!selectedRange) return;
    
    const currentProducts = relationships.rangeToProducts[selectedRange] || [];
    
    // Don't add if already in the list
    if (currentProducts.includes(productId)) return;
    
    const newRelationships = {
      ...relationships,
      rangeToProducts: {
        ...relationships.rangeToProducts,
        [selectedRange]: [...currentProducts, productId]
      }
    };
    
    onRelationshipsChange(newRelationships);
  }, [selectedRange, relationships, onRelationshipsChange]);

  const handleRemoveProductFromRange = React.useCallback((productId: string) => {
    if (!selectedRange) return;
    
    const currentProducts = relationships.rangeToProducts[selectedRange] || [];
    
    const newRelationships = {
      ...relationships,
      rangeToProducts: {
        ...relationships.rangeToProducts,
        [selectedRange]: currentProducts.filter(id => id !== productId)
      }
    };
    
    onRelationshipsChange(newRelationships);
  }, [selectedRange, relationships, onRelationshipsChange]);

  // Optimize drag handlers to prevent excessive re-renders and fix drag functionality
  const handleRangeOrderChange = React.useCallback((event: DragEndEvent) => {
    if (!selectedGroup) return;
    
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const currentRanges = [...(relationships.groupToRanges[selectedGroup] || [])];
    const oldIndex = currentRanges.indexOf(String(active.id));
    const newIndex = currentRanges.indexOf(String(over.id));
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = [...currentRanges];
      const [movedItem] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, movedItem);
      
      // Only update if the order actually changed
      if (JSON.stringify(newOrder) !== JSON.stringify(currentRanges)) {
        const newRelationships = {
          ...relationships,
          groupToRanges: {
            ...relationships.groupToRanges,
            [selectedGroup]: newOrder
          }
        };
        
        onRelationshipsChange(newRelationships);
      }
    }
  }, [selectedGroup, relationships, onRelationshipsChange]);

  const handleProductOrderChange = React.useCallback((event: DragEndEvent) => {
    if (!selectedRange) return;
    
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const currentProducts = [...(relationships.rangeToProducts[selectedRange] || [])];
    const oldIndex = currentProducts.indexOf(String(active.id));
    const newIndex = currentProducts.indexOf(String(over.id));
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = [...currentProducts];
      const [movedItem] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, movedItem);
      
      // Only update if the order actually changed
      if (JSON.stringify(newOrder) !== JSON.stringify(currentProducts)) {
        const newRelationships = {
          ...relationships,
          rangeToProducts: {
            ...relationships.rangeToProducts,
            [selectedRange]: newOrder
          }
        };
        
        onRelationshipsChange(newRelationships);
      }
    }
  }, [selectedRange, relationships, onRelationshipsChange]);

  // Memoize derived data to prevent recalculations on every render
  const availableRanges = React.useMemo(() => {
    if (!selectedGroup) return [];
    
    const associatedRangeIds = relationships.groupToRanges[selectedGroup] || [];
    return ranges.filter(range => !associatedRangeIds.includes(range.id));
  }, [selectedGroup, relationships.groupToRanges, ranges]);

  const availableProducts = React.useMemo(() => {
    if (!selectedRange) return [];
    
    const associatedProductIds = relationships.rangeToProducts[selectedRange] || [];
    return products.filter(product => !associatedProductIds.includes(product.id));
  }, [selectedRange, relationships.rangeToProducts, products]);

  const associatedRanges = React.useMemo(() => {
    if (!selectedGroup) return [];
    
    const associatedRangeIds = relationships.groupToRanges[selectedGroup] || [];
    return associatedRangeIds.map(id => ranges.find(range => range.id === id)).filter(Boolean) as ProductRange[];
  }, [selectedGroup, relationships.groupToRanges, ranges]);

  const associatedProducts = React.useMemo(() => {
    if (!selectedRange) return [];
    
    const associatedProductIds = relationships.rangeToProducts[selectedRange] || [];
    return associatedProductIds.map(id => products.find(product => product.id === id)).filter(Boolean) as Product[];
  }, [selectedRange, relationships.rangeToProducts, products]);

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Groups Column */}
        <Card>
          <CardHeader className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Product Groups</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {groups.map(group => (
                <Button
                  key={group.id}
                  variant={selectedGroup === group.id ? "solid" : "flat"}
                  color={selectedGroup === group.id ? "primary" : "default"}
                  className="w-full justify-start"
                  startContent={<Icon icon={group.icon} width={18} />}
                  onPress={() => handleGroupSelect(group.id)}
                >
                  {group.name}
                </Button>
              ))}
              
              {groups.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-default-500">No product groups available</p>
                  <p className="text-xs text-default-400 mt-1">Add groups in the Product Groups tab</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
        
        {/* Product Ranges Column */}
        <Card>
          <CardHeader className="flex justify-between items-center">
            <h3 className="text-lg font-medium">
              {selectedGroup ? 
                `Ranges in ${groups.find(g => g.id === selectedGroup)?.name}` : 
                "Select a Group"
              }
            </h3>
          </CardHeader>
          <CardBody>
            {selectedGroup ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Associated Ranges</h4>
                  {associatedRanges.length > 0 ? (
                    <DndContext 
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleRangeOrderChange}
                    >
                      <SortableContext 
                        items={associatedRanges.map(range => range.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {associatedRanges.map(range => (
                          <DraggableItem key={range.id} id={range.id}>
                            <div 
                              className={`flex-grow flex items-center gap-2 ${
                                selectedRange === range.id ? "text-primary font-medium" : ""
                              }`}
                              onClick={() => handleRangeSelect(range.id)}
                            >
                              <Icon icon="lucide:grip" className="text-default-400" width={16} />
                              <span>{range.name}</span>
                            </div>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="flat"
                              color="danger"
                              onPress={() => handleRemoveRangeFromGroup(range.id)}
                            >
                              <Icon icon="lucide:x" width={16} />
                            </Button>
                          </DraggableItem>
                        ))}
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="text-center py-4 border border-dashed border-default-200 rounded-medium">
                      <p className="text-default-500">No ranges associated</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Available Ranges</h4>
                  {availableRanges.length > 0 ? (
                    <div className="space-y-2">
                      {availableRanges.map(range => (
                        <div 
                          key={range.id}
                          className="p-3 bg-default-50 rounded-medium border border-default-100 flex items-center justify-between"
                        >
                          <span>{range.name}</span>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="flat"
                            color="primary"
                            onPress={() => handleAddRangeToGroup(range.id)}
                          >
                            <Icon icon="lucide:plus" width={16} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 border border-dashed border-default-200 rounded-medium">
                      <p className="text-default-500">No available ranges</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Icon icon="lucide:arrow-left" className="mx-auto mb-2 text-default-400" width={24} />
                <p className="text-default-500">Select a product group</p>
              </div>
            )}
          </CardBody>
        </Card>
        
        {/* Products Column */}
        <Card>
          <CardHeader className="flex justify-between items-center">
            <h3 className="text-lg font-medium">
              {selectedRange ? 
                `Products in ${ranges.find(r => r.id === selectedRange)?.name}` : 
                "Select a Range"
              }
            </h3>
          </CardHeader>
          <CardBody>
            {selectedRange ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Associated Products</h4>
                  {associatedProducts.length > 0 ? (
                    <DndContext 
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleProductOrderChange}
                    >
                      <SortableContext 
                        items={associatedProducts.map(product => product.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {associatedProducts.map(product => (
                          <DraggableItem key={product.id} id={product.id}>
                            <div className="flex-grow flex items-center gap-2">
                              <Icon icon="lucide:grip" className="text-default-400" width={16} />
                              <div>
                                <div>{product.name}</div>
                                <div className="text-xs text-default-500">Code: {product.code}</div>
                              </div>
                            </div>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="flat"
                              color="danger"
                              onPress={() => handleRemoveProductFromRange(product.id)}
                            >
                              <Icon icon="lucide:x" width={16} />
                            </Button>
                          </DraggableItem>
                        ))}
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="text-center py-4 border border-dashed border-default-200 rounded-medium">
                      <p className="text-default-500">No products associated</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Available Products</h4>
                  {availableProducts.length > 0 ? (
                    <div className="space-y-2">
                      {availableProducts.map(product => (
                        <div 
                          key={product.id}
                          className="p-3 bg-default-50 rounded-medium border border-default-100 flex items-center justify-between"
                        >
                          <div>
                            <div>{product.name}</div>
                            <div className="text-xs text-default-500">Code: {product.code}</div>
                          </div>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="flat"
                            color="primary"
                            onPress={() => handleAddProductToRange(product.id)}
                          >
                            <Icon icon="lucide:plus" width={16} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 border border-dashed border-default-200 rounded-medium">
                      <p className="text-default-500">No available products</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Icon icon="lucide:arrow-left" className="mx-auto mb-2 text-default-400" width={24} />
                <p className="text-default-500">Select a product range</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};