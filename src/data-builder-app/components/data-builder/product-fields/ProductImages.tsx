import React from "react";
import { Button, Card, CardBody, Image } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ProductImagesProps {
  productCode: string;
  imageGallery: string[];
  onChange: (imageGallery: string[]) => void;
}

interface SortableImageProps {
  id: string;
  index: number;
  image: string;
  productCode: string;
  onRemove: () => void;
}

const SortableImage: React.FC<SortableImageProps> = ({ id, image, productCode, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="relative"
      {...attributes}
    >
      <Card className="overflow-visible">
        <CardBody className="p-0 overflow-hidden">
          <div className="aspect-square relative group">
            <Image
              removeWrapper
              alt={`Product image ${id}`}
              className="w-full h-full object-cover"
              src={`https://img.heroui.chat/image/${image}?w=300&h=300&u=${productCode}_${id}`}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
              <Button
                isIconOnly
                color="danger"
                variant="flat"
                className="bg-white/80"
                onPress={onRemove}
              >
                <Icon icon="lucide:trash-2" width={18} />
              </Button>
            </div>
            <div 
              className="absolute top-0 right-0 left-0 h-8 cursor-move flex items-center justify-center bg-black/30 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              {...listeners}
            >
              <Icon icon="lucide:grip" width={16} />
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
};

export const ProductImages: React.FC<ProductImagesProps> = ({ 
  productCode, 
  imageGallery, 
  onChange 
}) => {
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

  // Fix drag end handler to properly identify items
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (active && over && active.id !== over.id) {
      // Extract the index from the id (format: "image-index")
      const getIndex = (id: string) => {
        const parts = id.split('-');
        return parseInt(parts[parts.length - 1], 10);
      };
      
      const oldIndex = getIndex(active.id.toString());
      const newIndex = getIndex(over.id.toString());
      
      if (!isNaN(oldIndex) && !isNaN(newIndex)) {
        const newImageGallery = [...imageGallery];
        const [movedItem] = newImageGallery.splice(oldIndex, 1);
        newImageGallery.splice(newIndex, 0, movedItem);
        
        onChange(newImageGallery);
      }
    }
  };

  const handleAddImage = (category: string) => {
    // Add a new image from the selected category
    const newImage = `${category}/${Math.floor(Math.random() * 10) + 1}`;
    onChange([...imageGallery, newImage]);
  };

  const handleRemoveImage = (index: number) => {
    const newImageGallery = [...imageGallery];
    newImageGallery.splice(index, 1);
    onChange(newImageGallery);
  };

  const imageCategories = [
    { name: "Shelter", value: "shelter" },
    { name: "Toilet", value: "toilet" },
    { name: "Bridge", value: "bridge" },
    { name: "Access", value: "access" },
    { name: "Landscape", value: "landscape" },
    { name: "Places", value: "places" }
  ];

  return (
    <div className="space-y-6 py-2">
      <div>
        <h4 className="text-sm font-medium mb-2">Add Images</h4>
        <div className="flex flex-wrap gap-2">
          {imageCategories.map((category) => (
            <Button
              key={category.value}
              variant="flat"
              color="primary"
              onPress={() => handleAddImage(category.value)}
              startContent={<Icon icon="lucide:image-plus" width={16} />}
            >
              {category.name}
            </Button>
          ))}
        </div>
      </div>
      
      <div>
        <h4 className="text-sm font-medium mb-2">Image Gallery</h4>
        <p className="text-xs text-default-500 mb-4">Drag images to reorder. First image will be used as the main product image.</p>
        
        {imageGallery.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-default-200 rounded-medium">
            <Icon icon="lucide:image" className="mx-auto mb-2 text-default-400" width={32} />
            <p className="text-default-500">No images added yet</p>
            <p className="text-xs text-default-400 mt-1">Click one of the buttons above to add images</p>
          </div>
        ) : (
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={imageGallery.map((img, i) => `${img}-${i}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                <AnimatePresence>
                  {imageGallery.map((image, index) => (
                    <SortableImage
                      key={`${image}-${index}`}
                      id={`${image}-${index}`}
                      index={index}
                      image={image}
                      productCode={productCode}
                      onRemove={() => handleRemoveImage(index)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
};