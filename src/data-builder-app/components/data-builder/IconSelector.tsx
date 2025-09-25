import React from "react";
import { Button, Input, Tabs, Tab } from "@heroui/react";
import { Icon } from "@iconify/react";

interface IconSelectorProps {
  selectedIcon: string;
  onSelectIcon: (icon: string) => void;
}

export const IconSelector: React.FC<IconSelectorProps> = ({ selectedIcon, onSelectIcon }) => {
  const [searchTerm, setSearchTerm] = React.useState("");

  // Common icon categories
  const iconCategories = {
    common: [
      "lucide:box",
      "lucide:home",
      "lucide:bath",
      "lucide:route",
      "lucide:wheelchair",
      "lucide:armchair",
      "lucide:lamp",
      "lucide:building",
      "lucide:building-2",
      "lucide:tent",
      "lucide:car",
      "lucide:truck",
      "lucide:bike",
      "lucide:bus",
      "lucide:train",
      "lucide:plane",
      "lucide:ship",
      "lucide:umbrella",
      "lucide:tree",
      "lucide:flower",
      "lucide:leaf",
      "lucide:mountain",
      "lucide:sun",
      "lucide:moon",
      "lucide:cloud",
      "lucide:cloud-rain",
      "lucide:cloud-snow",
      "lucide:wind",
    ],
    buildings: [
      "lucide:home",
      "lucide:building",
      "lucide:building-2",
      "lucide:tent",
      "lucide:warehouse",
      "lucide:landmark",
      "lucide:church",
      "lucide:school",
      "lucide:hospital",
      "lucide:hotel",
      "lucide:store",
      "lucide:factory",
      "lucide:library",
      "lucide:castle",
      "lucide:office",
      "lucide:home-2",
    ],
    objects: [
      "lucide:box",
      "lucide:package",
      "lucide:gift",
      "lucide:briefcase",
      "lucide:shopping-bag",
      "lucide:shopping-cart",
      "lucide:tool",
      "lucide:wrench",
      "lucide:hammer",
      "lucide:axe",
      "lucide:scissors",
      "lucide:key",
      "lucide:lock",
      "lucide:unlock",
      "lucide:shield",
      "lucide:umbrella",
      "lucide:lamp",
      "lucide:lightbulb",
      "lucide:battery",
      "lucide:plug",
      "lucide:smartphone",
      "lucide:laptop",
      "lucide:desktop",
      "lucide:printer",
    ],
    nature: [
      "lucide:tree",
      "lucide:flower",
      "lucide:leaf",
      "lucide:mountain",
      "lucide:sun",
      "lucide:moon",
      "lucide:cloud",
      "lucide:cloud-rain",
      "lucide:cloud-snow",
      "lucide:wind",
      "lucide:droplet",
      "lucide:waves",
      "lucide:flame",
      "lucide:snowflake",
      "lucide:thermometer",
      "lucide:rainbow",
    ],
  };

  const filteredIcons = searchTerm
    ? Object.values(iconCategories)
        .flat()
        .filter((icon) => icon.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-default-100 flex items-center justify-center">
            <Icon icon={selectedIcon} width={24} />
          </div>
        </div>
        <div className="flex-grow">
          <Input
            label="Selected Icon"
            value={selectedIcon}
            onValueChange={onSelectIcon}
            startContent={<Icon icon={selectedIcon} width={16} />}
            description="You can enter any Iconify icon name or select from below"
          />
        </div>
      </div>

      <div>
        <Input
          placeholder="Search icons..."
          value={searchTerm}
          onValueChange={setSearchTerm}
          startContent={<Icon icon="lucide:search" width={16} />}
        />
      </div>

      <div className="border border-default-200 rounded-medium p-4">
        {searchTerm ? (
          <div>
            <h4 className="text-sm font-medium mb-3">Search Results</h4>
            <div className="grid grid-cols-8 gap-2">
              {filteredIcons.length > 0 ? (
                filteredIcons.map((icon) => (
                  <Button
                    key={icon}
                    isIconOnly
                    variant={selectedIcon === icon ? "solid" : "flat"}
                    color={selectedIcon === icon ? "primary" : "default"}
                    className="aspect-square"
                    onPress={() => onSelectIcon(icon)}
                  >
                    <Icon icon={icon} width={20} />
                  </Button>
                ))
              ) : (
                <div className="col-span-8 text-center py-4 text-default-500">No icons found matching "{searchTerm}"</div>
              )}
            </div>
          </div>
        ) : (
          <Tabs aria-label="Icon Categories">
            {Object.entries(iconCategories).map(([category, icons]) => (
              <Tab key={category} title={category.charAt(0).toUpperCase() + category.slice(1)}>
                <div className="grid grid-cols-8 gap-2">
                  {icons.map((icon) => (
                    <Button
                      key={icon}
                      isIconOnly
                      variant={selectedIcon === icon ? "solid" : "flat"}
                      color={selectedIcon === icon ? "primary" : "default"}
                      className="aspect-square"
                      onPress={() => onSelectIcon(icon)}
                    >
                      <Icon icon={icon} width={20} />
                    </Button>
                  ))}
                </div>
              </Tab>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
};
