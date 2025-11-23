import { describe, expect, it } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import "@testing-library/jest-dom/vitest"
import { EffectProvider, RegionCascade } from "../src/features/region-cascade"

describe("RegionCascade UI flow", () => {
  it("allows selecting province, city and district", async () => {
    const user = userEvent.setup()

    render(
      <EffectProvider>
        <RegionCascade />
      </EffectProvider>
    )

    // Province load takes 1s
    const provinceSelect = await screen.findByLabelText("省份", {}, { timeout: 2000 })
    // Select Beijing (p1)
    await user.selectOptions(provinceSelect, "p1")
    await waitFor(() => expect(provinceSelect).toHaveValue("p1"))

    // City load takes 1s after province selection
    const citySelect = await screen.findByLabelText("城市")
    await waitFor(() => expect(citySelect).not.toBeDisabled(), { timeout: 2000 })

    // Select Beijing City (c101)
    // Note: The mock data has "北京城区" as the name for c101
    const beijingOption = await within(citySelect).findByRole("option", {
      name: "北京城区"
    })
    await user.selectOptions(citySelect, beijingOption)
    await waitFor(() => expect(citySelect).toHaveValue("c101"))

    // District load takes 1s after city selection
    const districtSelect = await screen.findByLabelText("区县")
    await waitFor(() => expect(districtSelect).not.toBeDisabled(), { timeout: 2000 })

    // Select Dongcheng (d1011)
    const dongchengOption = await within(districtSelect).findByRole("option", {
      name: "东城区"
    })
    await user.selectOptions(districtSelect, dongchengOption)
    await waitFor(() => expect(districtSelect).toHaveValue("d1011"))

    const stateDisplay = await screen.findByText(
      (content, node) =>
        node?.tagName === "PRE" &&
        content.includes('"provinceId": "p1"') &&
        content.includes('"cityId": "c101"') &&
        content.includes('"districtId": "d1011"')
    )

    expect(stateDisplay).toBeInTheDocument()
  }, 10000) // Increase test timeout
})
